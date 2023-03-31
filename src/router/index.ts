import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/BlockfrostView.vue"),
    },
    {
      path: "/wallets",
      name: "wallets",
      component: () => import("../views/WalletsView.vue"),
    },
    {
      path: "/wallet/:selected",
      name: "wallet",
      component: () => import("../views/WalletsView.vue"),
      props: true,
    },
    {
      path: "/beneficient",
      name: "beneficient",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("../views/BeneficientView.vue"),
    },
  ],
});

export default router;
