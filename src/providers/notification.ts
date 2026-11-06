import type { NotificationProvider } from "@refinedev/core";
import { toast } from "@/components/ui/toast";

export const notificationProvider: NotificationProvider = {
  open: ({ key, type, message, description }) => {
 
    if (type === "error" && key) return;
    toast.add({
      id: key,
      type: type === "progress" ? "loading" : type,
      title: message,
      description,
    });
  },
  close: (key) => toast.close(key),
};
