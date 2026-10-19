import { Toast } from "@base-ui/react/toast";

export { Toast };

export function Toaster() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col items-center gap-2 outline-none">
        {toasts.map((toast) => (
          <Toast.Root key={toast.id} toast={toast} className="toast-notice rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs text-white shadow-lg outline-none data-[limited]:hidden dark:bg-zinc-100 dark:text-zinc-900">
            <Toast.Title>{toast.title}</Toast.Title>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
