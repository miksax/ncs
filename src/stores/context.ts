import { defineStore } from "pinia";

export const contextStore = defineStore("context", {
  state: () => {
    return { count: 0 };
  },
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++;
    },
    async test() {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("kokot");
    },
  },
});
