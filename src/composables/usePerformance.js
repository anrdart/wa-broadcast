import { ref, computed, shallowRef, markRaw } from 'vue'
import { debounce, throttle } from 'lodash-es'

/**
 * Composable for performance optimizations
 */
export function usePerformance() {
  
  /**
   * Create a debounced function
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  const createDebounced = (fn, delay = 300) => {
    return debounce(fn, delay)
  }
  
  /**
   * Create a throttled function
   * @param {Function} fn - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  const createThrottled = (fn, delay = 100) => {
    return throttle(fn, delay)
  }
  
  /**
   * Create a memoized computed property
   * @param {Function} getter - Computed getter function
   * @param {Array} dependencies - Dependencies to watch
   * @returns {ComputedRef} Memoized computed
   */
  const createMemoizedComputed = (getter, dependencies = []) => {
    const cache = new Map()
    
    return computed(() => {
      // Create a safe key without circular references
      const key = dependencies.map((dep, index) => {
        try {
          const value = dep.value
          if (typeof value === 'object' && value !== null) {
            // For objects, use a simple hash based on constructor and length/size
            return `${index}:${value.constructor.name}:${Object.keys(value).length}`
          }
          return `${index}:${value}`
        } catch (e) {
          return `${index}:error`
        }
      }).join('|')
      
      if (cache.has(key)) {
        return cache.get(key)
      }
      
      const result = getter()
      cache.set(key, result)
      
      // Clear old cache entries to prevent memory leaks
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
      }
      
      return result
    })
  }
  
  /**
   * Create a shallow reactive reference for large objects
   * @param {*} value - Initial value
   * @returns {ShallowRef} Shallow reactive reference
   */
  const createShallowReactive = (value) => {
    return shallowRef(value)
  }
  
  /**
   * Mark an object as raw (non-reactive) for performance
   * @param {*} obj - Object to mark as raw
   * @returns {*} Raw object
   */
  const createRawObject = (obj) => {
    return markRaw(obj)
  }
  
  /**
   * Create a virtual scrolling helper
   * @param {Object} options - Virtual scrolling options
   * @returns {Object} Virtual scrolling utilities
   */
  const createVirtualScrolling = (options = {}) => {
    const {
      itemHeight = 50,
      containerHeight = 400,
      overscan = 5
    } = options
    
    const scrollTop = ref(0)
    const items = ref([])
    
    const visibleRange = computed(() => {
      const start = Math.floor(scrollTop.value / itemHeight)
      const end = Math.min(
        start + Math.ceil(containerHeight / itemHeight) + overscan,
        items.value.length
      )
      
      return {
        start: Math.max(0, start - overscan),
        end
      }
    })
    
    const visibleItems = computed(() => {
      const { start, end } = visibleRange.value
      return items.value.slice(start, end).map((item, index) => ({
        ...item,
        index: start + index,
        top: (start + index) * itemHeight
      }))
    })
    
    const totalHeight = computed(() => items.value.length * itemHeight)
    
    const handleScroll = createThrottled((event) => {
      scrollTop.value = event.target.scrollTop
    }, 16) // ~60fps
    
    return {
      scrollTop,
      items,
      visibleRange,
      visibleItems,
      totalHeight,
      handleScroll,
      setItems: (newItems) => {
        items.value = newItems
      }
    }
  }
  
  /**
   * Create a search optimization helper
   * @param {Array} items - Items to search
   * @param {Function} searchFn - Search function
   * @param {number} debounceDelay - Debounce delay for search
   * @returns {Object} Search utilities
   */
  const createOptimizedSearch = (items, searchFn, debounceDelay = 300) => {
    const searchQuery = ref('')
    const searchResults = ref([])
    const isSearching = ref(false)
    
    const performSearch = createDebounced(async (query) => {
      if (!query.trim()) {
        searchResults.value = items.value
        isSearching.value = false
        return
      }
      
      isSearching.value = true
      
      try {
        const results = await searchFn(items.value, query)
        searchResults.value = results
      } catch (error) {
        console.error('Search error:', error)
        searchResults.value = []
      } finally {
        isSearching.value = false
      }
    }, debounceDelay)
    
    const setSearchQuery = (query) => {
      searchQuery.value = query
      performSearch(query)
    }
    
    return {
      searchQuery,
      searchResults,
      isSearching,
      setSearchQuery
    }
  }
  
  /**
   * Create a lazy loading helper for images
   * @param {Object} options - Lazy loading options
   * @returns {Object} Lazy loading utilities
   */
  const createLazyLoading = (options = {}) => {
    const {
      rootMargin = '50px',
      threshold = 0.1
    } = options
    
    const observer = ref(null)
    const loadedImages = ref(new Set())
    
    const initObserver = () => {
      if (typeof IntersectionObserver === 'undefined') {
        return
      }
      
      observer.value = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target
              const src = img.dataset.src
              
              if (src && !loadedImages.value.has(src)) {
                img.src = src
                loadedImages.value.add(src)
                observer.value.unobserve(img)
              }
            }
          })
        },
        {
          rootMargin,
          threshold
        }
      )
    }
    
    const observeImage = (imgElement) => {
      if (observer.value && imgElement) {
        observer.value.observe(imgElement)
      }
    }
    
    const cleanup = () => {
      if (observer.value) {
        observer.value.disconnect()
      }
    }
    
    return {
      initObserver,
      observeImage,
      cleanup,
      loadedImages
    }
  }
  
  return {
    createDebounced,
    createThrottled,
    createMemoizedComputed,
    createShallowReactive,
    createRawObject,
    createVirtualScrolling,
    createOptimizedSearch,
    createLazyLoading
  }
}

/**
 * Performance monitoring utilities
 */
export function usePerformanceMonitoring() {
  const metrics = ref({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0
  })
  
  const startRenderTimer = () => {
    return performance.now()
  }
  
  const endRenderTimer = (startTime, componentName = 'Unknown') => {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    metrics.value.renderTime = renderTime
    
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }
    
    return renderTime
  }
  
  const measureMemoryUsage = () => {
    if (performance.memory) {
      metrics.value.memoryUsage = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      }
    }
  }
  
  const logPerformanceMetrics = () => {
    console.group('Performance Metrics')
    console.log('Render Time:', metrics.value.renderTime + 'ms')
    console.log('Component Count:', metrics.value.componentCount)
    console.log('Memory Usage:', metrics.value.memoryUsage)
    console.groupEnd()
  }
  
  return {
    metrics,
    startRenderTimer,
    endRenderTimer,
    measureMemoryUsage,
    logPerformanceMetrics
  }
}