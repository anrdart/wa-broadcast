<template>
  <div class="virtual-contact-list h-full">

    
    <div
      ref="parentRef"
      class="h-full overflow-auto"
      :style="{
        height: `${height}px`,
        width: '100%',
      }"
    >
      <div
        :style="{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }"
      >
        <div
          v-for="item in virtualItems"
          :key="item.key"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${item.size}px`,
            transform: `translateY(${item.start}px)`,
          }"
        >
          <ContactItem
            :contact="contacts[item.index]"
            :is-selected="selectedContacts.has(contacts[item.index].id)"
            @toggle-select="handleToggleSelect(contacts[item.index])"
            @edit="handleEdit(contacts[item.index])"
            @delete="handleDelete(contacts[item.index])"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { usePerformance } from '../composables/usePerformance'
import ContactItem from './ContactItem.vue'

const props = defineProps({
  contacts: {
    type: Array,
    required: true
  },
  selectedContacts: {
    type: Set,
    required: true
  },
  height: {
    type: Number,
    default: 400
  }
})

const emit = defineEmits(['toggle-select', 'edit', 'delete'])

// Performance optimizations
const { createThrottled } = usePerformance()

const parentRef = ref(null)

const virtualizer = useVirtualizer(
  computed(() => ({
    count: props.contacts.length,
    getScrollElement: () => parentRef.value,
    estimateSize: () => 80, // Estimated height of each contact item
    overscan: 5, // Render 5 extra items outside visible area
  }))
)

// Use plain computed so it reacts to virtualizer state (scroll/measure)
const virtualItems = computed(() => {
  return virtualizer.value?.getVirtualItems?.() ?? []
})

const totalSize = computed(() => {
  return virtualizer.value?.getTotalSize?.() ?? 0
})

// Throttled event handlers to prevent excessive re-renders
const handleToggleSelect = createThrottled((contact) => {
  emit('toggle-select', contact)
}, 50)

const handleEdit = createThrottled((contact) => {
  emit('edit', contact)
}, 100)

const handleDelete = createThrottled((contact) => {
  emit('delete', contact)
}, 100)

// Handle window resize
const handleResize = () => {
  if (virtualizer.value?.measure) {
    virtualizer.value.measure()
  }
}

// Re-measure when contacts change
watch(() => props.contacts.length, () => {
  nextTick(() => {
    if (virtualizer.value?.measure) {
      virtualizer.value.measure()
    }
  })
})

// Performance monitoring
let renderStartTime = 0

onMounted(() => {
  renderStartTime = performance.now()
  window.addEventListener('resize', handleResize)
  // Ensure first measurement after mount so items render
  nextTick(() => {
    if (virtualizer.value?.measure) {
      virtualizer.value.measure()
    }
  })
})

onUnmounted(() => {
  const renderTime = performance.now() - renderStartTime

  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.virtual-contact-list {
  /* Ensure smooth scrolling */
  scroll-behavior: smooth;
}

/* Custom scrollbar styling */
.virtual-contact-list::-webkit-scrollbar {
  width: 6px;
}

.virtual-contact-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.virtual-contact-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.virtual-contact-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>