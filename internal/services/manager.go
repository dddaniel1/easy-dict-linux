package services

import (
	"slices"
	"strings"
	"sync"

	"easydict-linux/internal/config"
)

type Manager struct {
	providers map[string]TranslationProvider
}

func NewManager() *Manager {
	m := &Manager{
		providers: make(map[string]TranslationProvider),
	}

	m.Register(NewYoudaoProvider())
	m.Register(NewBingProvider())
	m.Register(NewGoogleProvider())
	m.Register(NewAIProvider())
	m.Register(NewDeepLProvider())

	return m
}

func (m *Manager) Register(p TranslationProvider) {
	m.providers[p.ID()] = p
}

func (m *Manager) GetProvider(id string) TranslationProvider {
	return m.providers[id]
}

func (m *Manager) QueryAll(req QueryRequest) []ServiceResult {
	cfg := config.Get()
	text := strings.TrimSpace(req.Text)
	if text == "" {
		return nil
	}

	activeServiceIDs := req.Services
	if len(activeServiceIDs) == 0 {
		activeServiceIDs = cfg.EnabledServices
	}

	// Filter down to valid registered providers
	var targets []TranslationProvider
	for _, id := range activeServiceIDs {
		if p, ok := m.providers[id]; ok {
			targets = append(targets, p)
		}
	}

	if len(targets) == 0 {
		// Fallback to Youdao if nothing enabled
		targets = append(targets, m.providers["youdao"])
	}

	results := make([]ServiceResult, len(targets))
	var wg sync.WaitGroup

	for i, provider := range targets {
		wg.Add(1)
		go func(idx int, p TranslationProvider) {
			defer wg.Done()
			res, err := p.Translate(req)
			if err != nil {
				results[idx] = ServiceResult{
					ServiceID:   p.ID(),
					ServiceName: p.Name(),
					Status:      "error",
					Error:       err.Error(),
				}
				return
			}
			if res != nil {
				results[idx] = *res
			}
		}(i, provider)
	}

	wg.Wait()

	// Prioritize dictionary results at the top if any
	slices.SortStableFunc(results, func(a, b ServiceResult) int {
		if a.IsDictionary && !b.IsDictionary {
			return -1
		}
		if !a.IsDictionary && b.IsDictionary {
			return 1
		}
		return 0
	})

	return results
}

func (m *Manager) QuerySingle(serviceID string, req QueryRequest) *ServiceResult {
	p, ok := m.providers[serviceID]
	if !ok {
		return &ServiceResult{
			ServiceID: serviceID,
			Status:    "error",
			Error:     "Service not found",
		}
	}
	res, err := p.Translate(req)
	if err != nil {
		return &ServiceResult{
			ServiceID:   p.ID(),
			ServiceName: p.Name(),
			Status:      "error",
			Error:       err.Error(),
		}
	}
	return res
}
