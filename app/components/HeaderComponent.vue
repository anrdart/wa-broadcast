<script setup lang="ts">
import { MessageCircle, Send, Calendar, Users, Settings, LogOut, Menu, X, Loader2 } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'

const appState = useAppState()
const api = useWhatsAppAPI()
const isLoggingOut = ref(false)

const navItems = [
  { id: 'broadcast', label: 'Broadcast', icon: Send },
  { id: 'history', label: 'History', icon: Calendar },
] as const

const handleLogout = async () => {
  if (!confirm('Are you sure you want to logout?')) return
  
  isLoggingOut.value = true
  
  try {
    // Call API to logout from WhatsApp
    await api.logout()
    
    // Clear local state
    appState.logout()
    
    // Redirect to login
    window.location.reload()
  } catch (err) {
    console.error('Logout failed:', err)
    // Still logout locally even if API fails
    appState.logout()
    window.location.reload()
  } finally {
    isLoggingOut.value = false
  }
}

const toggleMobileMenu = () => {
  appState.isMobileMenuOpen.value = !appState.isMobileMenuOpen.value
}
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="container flex h-16 items-center justify-between px-4">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-whatsapp">
          <MessageCircle class="w-5 h-5 text-white" />
        </div>
        <div class="hidden sm:block">
          <h1 class="text-lg font-bold">Broadcasto</h1>
          <p class="text-xs text-muted-foreground">WhatsApp Broadcast</p>
        </div>
      </div>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center gap-1">
        <Button
          v-for="item in navItems"
          :key="item.id"
          :variant="appState.currentView.value === item.id ? 'default' : 'ghost'"
          size="sm"
          @click="appState.setCurrentView(item.id)"
          class="gap-2"
        >
          <component :is="item.icon" class="w-4 h-4" />
          {{ item.label }}
        </Button>
      </nav>

      <!-- Right Side -->
      <div class="flex items-center gap-2">
        <Badge variant="success" class="hidden sm:flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-white animate-pulse" />
          Connected
        </Badge>
        
        <Button variant="ghost" size="icon" class="hidden md:flex">
          <Settings class="w-5 h-5" />
        </Button>
        
        <Button 
          variant="destructive" 
          size="sm" 
          @click="handleLogout" 
          :disabled="isLoggingOut"
          class="hidden md:flex gap-2"
        >
          <Loader2 v-if="isLoggingOut" class="w-4 h-4 animate-spin" />
          <LogOut v-else class="w-4 h-4" />
          {{ isLoggingOut ? 'Logging out...' : 'Logout' }}
        </Button>

        <!-- Mobile Menu Button -->
        <Button variant="ghost" size="icon" class="md:hidden" @click="toggleMobileMenu">
          <Menu v-if="!appState.isMobileMenuOpen.value" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
        </Button>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <Transition name="slide-down">
      <div v-if="appState.isMobileMenuOpen.value" class="md:hidden border-t bg-background p-4 space-y-2">
        <Button
          v-for="item in navItems"
          :key="item.id"
          :variant="appState.currentView.value === item.id ? 'default' : 'ghost'"
          class="w-full justify-start gap-2"
          @click="appState.setCurrentView(item.id); appState.isMobileMenuOpen.value = false"
        >
          <component :is="item.icon" class="w-4 h-4" />
          {{ item.label }}
        </Button>
        <hr class="border-border" />
        <Button 
          variant="destructive" 
          class="w-full gap-2" 
          @click="handleLogout"
          :disabled="isLoggingOut"
        >
          <Loader2 v-if="isLoggingOut" class="w-4 h-4 animate-spin" />
          <LogOut v-else class="w-4 h-4" />
          {{ isLoggingOut ? 'Logging out...' : 'Logout' }}
        </Button>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
