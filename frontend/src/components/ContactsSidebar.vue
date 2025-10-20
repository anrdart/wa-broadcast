<template>
  <aside
    class="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-2xl backdrop-blur-xl"
    role="region"
    aria-labelledby="contacts-title"
  >
    <header class="flex flex-col gap-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-start gap-4">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
          <i class="fas fa-address-book" aria-hidden="true"></i>
        </span>
        <div class="space-y-1">
          <h3 id="contacts-title" class="text-lg font-semibold leading-tight">Daftar Kontak</h3>
          <p class="text-sm text-white/80">Kelola target broadcast dan impor kontak baru</p>
        </div>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button
          class="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-70"
          :aria-label="isLoadingContacts ? 'Memuat ulang kontak' : 'Segarkan kontak'"
          @click="refreshContacts"
          :disabled="isLoadingContacts"
        >
          <i :class="[isLoadingContacts ? 'fas fa-spinner fa-spin' : 'fas fa-rotate-right']" aria-hidden="true"></i>
          <span class="hidden sm:inline">{{ isLoadingContacts ? 'Memuat…' : 'Segarkan' }}</span>
        </button>
        <button
          class="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label="Impor kontak dari CSV"
          @click="triggerCsvImport"
        >
          <i class="fas fa-file-import" aria-hidden="true"></i>
          <span class="hidden sm:inline">Impor</span>
        </button>
        <input
          type="file"
          ref="csvFileInput"
          accept=".csv"
          class="hidden"
          @change="handleCsvImport"
        >
      </div>
    </header>

    <section class="border-b border-slate-200 px-6 py-5">
      <div class="space-y-4">
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
            <i class="fas fa-search" aria-hidden="true"></i>
          </span>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Cari nama atau nomor..."
            class="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-12 pr-12 text-sm text-slate-700 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            @input="filterContacts"
            aria-label="Cari kontak"
          >
          <button
            class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            v-if="searchQuery"
            @click="clearSearch"
            aria-label="Hapus pencarian"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <label class="group inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600">
            <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" class="peer sr-only">
            <span class="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] text-transparent transition peer-checked:border-transparent peer-checked:bg-emerald-500 peer-checked:text-white">
              <i class="fas fa-check" aria-hidden="true"></i>
            </span>
            <span class="transition peer-checked:text-emerald-600">Pilih Semua</span>
          </label>

          <label class="group inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600">
            <input type="checkbox" v-model="showSaved" @change="filterContacts" class="peer sr-only">
            <span class="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] text-transparent transition peer-checked:border-transparent peer-checked:bg-emerald-500 peer-checked:text-white">
              <i class="fas fa-check" aria-hidden="true"></i>
            </span>
            <span class="transition peer-checked:text-emerald-600">Tersimpan</span>
          </label>

          <label class="group inline-flex cursor-pointer select-none items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-600">
            <input type="checkbox" v-model="showCsv" @change="filterContacts" class="peer sr-only">
            <span class="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[10px] text-transparent transition peer-checked:border-transparent peer-checked:bg-emerald-500 peer-checked:text-white">
              <i class="fas fa-check" aria-hidden="true"></i>
            </span>
            <span class="transition peer-checked:text-emerald-600">CSV</span>
          </label>
        </div>
      </div>
    </section>

    <section class="px-6 py-4">
      <div class="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700 shadow-sm">
        <div class="flex items-center gap-3">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-500">
            <i class="fas fa-users" aria-hidden="true"></i>
          </span>
          <span class="font-semibold">{{ filteredContacts.length }} kontak</span>
        </div>
        <span
          v-if="selectedContactsCount > 0"
          class="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 shadow"
        >
          {{ selectedContactsCount }} dipilih
        </span>
      </div>
    </section>

    <div class="flex-1 overflow-hidden px-6 pb-6">
      <div class="relative h-full rounded-2xl border border-slate-200 bg-white/80 shadow-inner">
        <div class="max-h-[420px] overflow-y-auto">
          <div v-if="isLoadingContacts" class="flex h-full flex-col items-center justify-center gap-3 px-6 py-20 text-center text-slate-500">
            <i class="fas fa-spinner fa-spin text-2xl" aria-hidden="true"></i>
            <p class="text-sm">Memuat kontak...</p>
          </div>

          <div v-else-if="filteredContacts.length === 0" class="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-400">
              <i class="fas fa-user-slash" aria-hidden="true"></i>
            </div>
            <div class="space-y-2">
              <h4 class="text-lg font-semibold text-slate-800">{{ searchQuery ? 'Tidak ada kontak ditemukan' : 'Belum ada kontak' }}</h4>
              <p class="text-sm text-slate-500">
                {{ searchQuery ? 'Coba kata kunci lain atau periksa filter aktif.' : 'Hubungkan WhatsApp untuk memuat daftar kontak Anda.' }}
              </p>
            </div>
            <button
              v-if="!searchQuery"
              class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              @click="refreshContacts"
            >
              <i class="fas fa-rotate-right" aria-hidden="true"></i>
              Muat Kontak
            </button>
          </div>

          <ul v-else role="list" aria-label="Daftar kontak" class="divide-y divide-slate-100">
            <li
              v-for="contact in filteredContacts"
              :key="contact.id"
            >
              <button
                type="button"
                class="group relative flex w-full items-center gap-4 px-5 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                :class="isSelected(contact.id) ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-200' : 'hover:bg-slate-50/80'"
                @click="handleContactClick($event, contact)"
                role="listitem"
                :aria-pressed="isSelected(contact.id)"
              >
                <span class="relative inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-base font-semibold text-white shadow-md">
                  {{ getContactInitials(contact.name || contact.number) }}
                  <span
                    v-if="isSelected(contact.id)"
                    class="absolute -bottom-2 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow-lg"
                  >
                    <i class="fas fa-check" aria-hidden="true"></i>
                  </span>
                </span>

                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-slate-900">
                    {{ contact.name || 'Tanpa Nama' }}
                  </span>
                  <span class="block truncate text-xs text-slate-500">
                    {{ contact.number }}
                  </span>
                </span>

                <span
                  :class="[
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                    getContactTypeClass(contact)
                  ]"
                >
                  {{ getContactTypeText(contact) }}
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAppStore } from '../stores/app'
import { showNotification } from '../utils/notifications'
import type { Contact } from '../stores/app'

const appStore = useAppStore()

const searchQuery = ref('')
const selectAll = ref(false)
const showSaved = ref(true)
const showCsv = ref(true)
const isLoadingContacts = ref(false)
const csvFileInput = ref<HTMLInputElement>()

const selectedContactsCount = computed(() => appStore.selectedContactsCount)

const filteredContacts = computed(() => {
  let filtered = appStore.contacts

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(contact =>
      (contact.name && contact.name.toLowerCase().includes(query)) ||
      contact.number.includes(query)
    )
  }

  if (!showSaved.value || !showCsv.value) {
    filtered = filtered.filter(contact => {
      if (showSaved.value && contact.isMyContact) return true
      if (showCsv.value && contact.isFromCSV) return true
      return false
    })
  }

  return filtered
})

const isSelected = (contactId: string): boolean => {
  return appStore.selectedContacts.has(contactId)
}

const handleContactClick = (event: Event, contact: Contact) => {
  if ('shiftKey' in event && event.shiftKey) {
    appStore.startChat(contact)
    return
  }

  appStore.toggleContactSelection(contact.id)
  updateSelectAllState()
}

const toggleSelectAll = () => {
  if (selectAll.value) {
    appStore.selectAllContacts()
  } else {
    appStore.clearContactSelection()
  }
}

const updateSelectAllState = () => {
  const totalFiltered = filteredContacts.value.length
  const selectedFiltered = filteredContacts.value.filter(contact => isSelected(contact.id)).length
  selectAll.value = totalFiltered > 0 && selectedFiltered === totalFiltered
}

const filterContacts = () => {
  updateSelectAllState()
}

const clearSearch = () => {
  searchQuery.value = ''
  filterContacts()
}

const getContactInitials = (name: string): string => {
  if (!name || name.length === 0) return '?'
  const words = name.trim().split(/\s+/).filter(word => word.length > 0)
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase()
  }
  return name.charAt(0).toUpperCase()
}

const getContactTypeClass = (contact: Contact): string => {
  if (contact.isMyContact) return 'border-emerald-200 bg-emerald-100 text-emerald-700'
  if (contact.isFromCSV) return 'border-sky-200 bg-sky-100 text-sky-700'
  return 'border-amber-200 bg-amber-100 text-amber-700'
}

const getContactTypeText = (contact: Contact): string => {
  if (contact.isMyContact) return 'Tersimpan'
  if (contact.isFromCSV) return 'Dari CSV'
  return 'Tidak Tersimpan'
}

const refreshContacts = () => {
  if (!appStore.isConnected) {
    showNotification('Please connect to WhatsApp first', 'warning')
    return
  }

  isLoadingContacts.value = true

  // Use the WebSocket service instead of direct socket access
  import('../services/websocket').then(({ wsService }) => {
    try {
      wsService.send({ type: 'get_contacts' })
      setTimeout(() => {
        isLoadingContacts.value = false
      }, 2000)
    } catch (error) {
      console.error('Failed to refresh contacts:', error)
      showNotification('Failed to refresh contacts', 'error')
      isLoadingContacts.value = false
    }
  }).catch(() => {
    showNotification('WebSocket service not available', 'error')
    isLoadingContacts.value = false
  })
}

const triggerCsvImport = () => {
  if (csvFileInput.value) {
    csvFileInput.value.click()
  }
}

const handleCsvImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  import('papaparse').then(Papa => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const importedContacts: Contact[] = results.data.map((row: any) => ({
          id: row.number || row.phone || `csv_${Date.now()}_${Math.random()}`,
          name: row.name || null,
          number: formatNumber(row.number || row.phone || ''),
          isMyContact: false,
          isFromCSV: true
        })).filter((contact: Contact) => contact.number)

        const uniqueContacts = importedContacts.filter(imp =>
          !appStore.contacts.some(existing => existing.number === imp.number)
        )

        appStore.importContactsFromCSV(uniqueContacts)

        if (uniqueContacts.length > 0) {
          showNotification(`Imported ${uniqueContacts.length} contacts`, 'success')
          showCsv.value = true
          filterContacts()
        } else {
          showNotification('No new contacts to import', 'info')
        }
      }
    })
  }).catch(() => {
    showNotification('CSV parsing library not available', 'error')
  })

  if (csvFileInput.value) {
    csvFileInput.value.value = ''
  }
}

const formatNumber = (number: string): string => {
  if (number.startsWith('62')) {
    return '0' + number.substring(2)
  }
  return number
}

watch(filteredContacts, updateSelectAllState)

onMounted(() => {
  updateSelectAllState()
})
</script>
