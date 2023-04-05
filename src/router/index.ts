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
      path: "/setting",
      name: "setting",
      component: () => import("../views/SettingView.vue"),
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
      path: "/create",
      name: "create",
      component: () => import("../views/ContractCreateView.vue"),
    },
    {
      path: "/contracts",
      name: "contractList",
      component: () => import("../views/ContractListView.vue"),
    },
    {
      path: "/contract/:txHash",
      name: "contractListSelected",
      component: () => import("../views/ContractListView.vue"),
      props: true,
    },
  ],
});

export default router;
