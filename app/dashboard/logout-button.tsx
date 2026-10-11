"use client";

import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

export function LogoutButton() {
  const router = useRouter();

  // Basic Auth has no real logout: the browser caches the password. Sending deliberately
  // wrong credentials makes the server answer 401, and the browser overwrites its cached
  // password with them, so the next visit to /dashboard asks for a login again.
  async function logout() {
    await fetch("/dashboard", {
      headers: { Authorization: `Basic ${btoa("logout:logout")}` },
      cache: "no-store",
    }).catch(() => {});
    router.push("/");
  }

  return (
    <button type="button" onClick={logout} className={styles.logout}>
      Log out
    </button>
  );
}
