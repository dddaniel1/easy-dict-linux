"""Check selection focus and tray quit against a running Easydict on Hyprland.

Run with system Python (PyGObject): python3 scripts/check-desktop.py --pid PID
This opens a temporary selection window and quits the specified Easydict process.
"""

import argparse
import json
from pathlib import Path
import subprocess
import time

import gi

gi.require_version("Gtk", "3.0")
from gi.repository import Gio, GLib, Gtk

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--pid", type=int, required=True)
parser.add_argument("--selection-popup", action="store_true", help="Also verify the compact translation popup")
args = parser.parse_args()
pid = args.pid
assert Path(f"/proc/{pid}/comm").read_text().strip() == "easydict"

bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)


def call(service, path, interface, method, signature, args):
    return bus.call_sync(service, path, interface, method, GLib.Variant(signature, args),
                         None, Gio.DBusCallFlags.NONE, 3000, None).unpack()


items, = call("org.kde.StatusNotifierWatcher", "/StatusNotifierWatcher",
              "org.freedesktop.DBus.Properties", "Get", "(ss)",
              ("org.kde.StatusNotifierWatcher", "RegisteredStatusNotifierItems"))
for item in items:
    service, path = item.split("/", 1)
    owner_pid, = call("org.freedesktop.DBus", "/org/freedesktop/DBus",
                      "org.freedesktop.DBus", "GetConnectionUnixProcessID", "(s)", (service,))
    if owner_pid == pid:
        menu_path, = call(service, "/" + path, "org.freedesktop.DBus.Properties", "Get", "(ss)",
                          ("org.kde.StatusNotifierItem", "Menu"))
        break
else:
    raise AssertionError("Easydict tray icon was not registered")

executable = str(Path(f"/proc/{pid}/exe").resolve()).removesuffix(" (deleted)")
subprocess.run([executable, "--input"], check=True)
window = Gtk.Window(title="Easydict focus regression")
entry = Gtk.Entry()
entry.set_text("easydict_selection_probe")
window.add(entry)
window.set_default_size(500, 100)
window.show_all()
checks = []
popup_checks = []
popup_details = {}
anchor = {}


def select():
    subprocess.run(["hyprctl", "dispatch",
                    'hl.dsp.focus({window="title:^(Easydict focus regression)$"})'],
                   check=True, stdout=subprocess.DEVNULL)
    entry.grab_focus()
    entry.select_region(0, 0)
    entry.select_region(0, -1)
    return False


def check_focus():
    checks.append(window.is_active() and entry.get_selection_bounds() == (0, 24))
    return False


def finish():
    window.destroy()
    Gtk.main_quit()
    return False


def open_popup():
    anchor.update(json.loads(subprocess.check_output(["hyprctl", "-j", "cursorpos"])))
    subprocess.run([executable, "--selection"], check=True)
    return False


def check_popup():
    monitors = json.loads(subprocess.check_output(["hyprctl", "-j", "layers"]))
    popups = [surface for monitor in monitors.values() for level in monitor["levels"].values()
              for surface in level if surface["pid"] == pid and surface["w"] > 400]
    popup_checks.append(len(popups) == 1 and popups[0]["w"] == 480 and popups[0]["h"] == 360)
    if popups:
        popup = popups[0]
        popup_details.update(anchor=anchor, bounds=popup)
        displays = json.loads(subprocess.check_output(["hyprctl", "-j", "monitors"]))
        top_inset = max(display["reserved"][1] for display in displays)
        # Layer-shell may offset the surface by the bar's exclusive zone.
        nearby_x = popup["x"] in (anchor["x"] + 12, anchor["x"] - 480 - 12)
        nearby_y = popup["y"] in (anchor["y"] + 12, anchor["y"] + 12 + top_inset,
                                   anchor["y"] - 360 - 12, anchor["y"] - 360 - 12 + top_inset)
        popup_checks.append(nearby_x and nearby_y)
    return False


GLib.timeout_add(500, select)
GLib.timeout_add(1000, check_focus)
GLib.timeout_add(1200, select)
GLib.timeout_add(2000, check_focus)
if args.selection_popup:
    GLib.timeout_add(2100, open_popup)
    GLib.timeout_add(3100, check_popup)
    GLib.timeout_add(3200, finish)
else:
    GLib.timeout_add(2100, finish)
Gtk.main()
_, layout = call(service, menu_path, "com.canonical.dbusmenu", "GetLayout", "(iias)", (0, -1, []))
quit_item = next(item[0] for item in layout[2] if item[1].get("label") == "退出 Easydict")
children = Path(f"/proc/{pid}/task/{pid}/children").read_text().split()
watchers = [child for child in children if Path(f"/proc/{child}/comm").read_text().strip() == "wl-paste"]
call(service, menu_path, "com.canonical.dbusmenu", "Event", "(isvu)",
     (quit_item, "clicked", GLib.Variant("i", 0), 0))
for _ in range(50):
    if not Path(f"/proc/{pid}").exists() and all(not Path(f"/proc/{child}").exists() for child in watchers):
        break
    time.sleep(0.1)
assert not Path(f"/proc/{pid}").exists(), "Tray Quit did not terminate Easydict"
assert all(not Path(f"/proc/{child}").exists() for child in watchers), "Selection watcher survived Quit"
assert checks == [True, True], f"Selection lost focus or highlight: {checks}"
print("PASS: selecting and reselecting text preserves focus and highlight")
if args.selection_popup:
    assert popup_checks == [True, True], f"Compact popup bounds were wrong: {popup_details}"
    print("PASS: 480x360 selection popup stays next to the selection endpoint, with edge avoidance")
print("PASS: tray Quit exits the application and stops its selection watcher")
