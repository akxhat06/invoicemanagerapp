import { showToast } from "nextjs-toast-notify";

/** Default options: top-right, no sound — see https://www.nextjstoastnotify.com/ */
const base = {
  position: "top-right" as const,
  duration: 4500,
  progress: true,
  transition: "fadeIn" as const,
  sound: false,
};

export function toastSuccess(message: string) {
  showToast.success(message, base);
}

export function toastError(message: string) {
  showToast.error(message, base);
}
