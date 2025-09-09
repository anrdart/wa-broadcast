import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: {
        title: 'WhatsApp Broadcast Tool'
      }
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('../views/Contacts.vue'),
      meta: {
        title: 'Kelola Kontak'
      }
    },
    {
      path: '/broadcast',
      name: 'broadcast',
      component: () => import('../views/Broadcast.vue'),
      meta: {
        title: 'Kirim Broadcast'
      }
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('../views/Templates.vue'),
      meta: {
        title: 'Template Pesan'
      }
    },

    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/Chat.vue'),
      meta: {
        title: 'Chat'
      }
    },
    {
      path: '/scheduling',
      name: 'scheduling',
      component: () => import('../views/Scheduling.vue'),
      meta: {
        title: 'Penjadwalan'
      }
    }
  ]
})

// Navigation guard untuk update title
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'WhatsApp Broadcast Tool'
  next()
})

export default router