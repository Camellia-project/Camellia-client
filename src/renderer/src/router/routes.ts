export const constantRoutes = [
  {
    path: '/',
    redirect: '/talk'
  },
  {
    path: '/talk',
    component: () => import('@renderer/pages/appTalk.vue')
  }
]
