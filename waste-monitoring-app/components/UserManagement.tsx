"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

type UserRole =
  | "ADMIN"
  | "PIC";

type UserItem = {
  user_id: string;
  name: string;
  email: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
};

export default function UserManagement() {
  const {
    userId,
    profile,
  } = useAuth();

  const [
    users,
    setUsers,
  ] = useState<UserItem[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    updating,
    setUpdating,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadUsers =
    useCallback(async () => {
      if (
        profile.role !==
        "ADMIN"
      ) {
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase
        .from(
          "user_profiles",
        )
        .select(`
          user_id,
          name,
          email,
          role,
          active,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: true,
          },
        );

      if (error) {
        setErrorMessage(
          error.message,
        );
      } else {
        setUsers(
          (data ?? []) as UserItem[],
        );
      }

      setLoading(false);
    }, [profile.role]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return users;
      }

      return users.filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          (
            item.email ??
            ""
          )
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          item.role
            .toLowerCase()
            .includes(
              keyword,
            ),
      );
    }, [
      users,
      search,
    ]);

  const adminCount =
    users.filter(
      (item) =>
        item.role ===
          "ADMIN" &&
        item.active,
    ).length;

  const picCount =
    users.filter(
      (item) =>
        item.role ===
          "PIC" &&
        item.active,
    ).length;

  async function changeRole(
    item: UserItem,
    role: UserRole,
  ) {
    if (
      item.user_id ===
      userId
    ) {
      setErrorMessage(
        "Role akun yang sedang digunakan tidak bisa diubah dari halaman ini.",
      );

      return;
    }

    setUpdating(
      item.user_id,
    );

    setMessage("");
    setErrorMessage("");

    const {
      error,
    } = await supabase
      .from(
        "user_profiles",
      )
      .update({
        role,
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "user_id",
        item.user_id,
      );

    if (error) {
      setErrorMessage(
        error.message,
      );
    } else {
      setMessage(
        `${item.name} berhasil diubah menjadi ${role}.`,
      );

      await loadUsers();
    }

    setUpdating("");
  }

  async function toggleActive(
    item: UserItem,
  ) {
    if (
      item.user_id ===
      userId
    ) {
      setErrorMessage(
        "Akun yang sedang digunakan tidak bisa dinonaktifkan.",
      );

      return;
    }

    const newStatus =
      !item.active;

    const confirmation =
      window.confirm(
        newStatus
          ? `Aktifkan kembali akun ${item.name}?`
          : `Nonaktifkan akun ${item.name}? User tidak akan bisa menggunakan sistem.`,
      );

    if (!confirmation) {
      return;
    }

    setUpdating(
      item.user_id,
    );

    setMessage("");
    setErrorMessage("");

    const {
      error,
    } = await supabase
      .from(
        "user_profiles",
      )
      .update({
        active:
          newStatus,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "user_id",
        item.user_id,
      );

    if (error) {
      setErrorMessage(
        error.message,
      );
    } else {
      setMessage(
        newStatus
          ? `${item.name} berhasil diaktifkan.`
          : `${item.name} berhasil dinonaktifkan.`,
      );

      await loadUsers();
    }

    setUpdating("");
  }

  if (
    profile.role !==
    "ADMIN"
  ) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">
          Administrator
        </p>

        <h2 className="mt-1 text-2xl font-black text-slate-900">
          Manajemen User
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Atur role dan status pengguna Waste Monitoring.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-sm">
          <p className="text-sm font-bold text-blue-100">
            Admin Aktif
          </p>

          <p className="mt-2 text-3xl font-black">
            {adminCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">
            PIC Aktif
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {picCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">
            Total Akun
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {users.length}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-black text-blue-700">
          Cara tambah pengguna
        </p>

        <p className="mt-1 text-sm text-slate-600">
          Buat akun baru melalui Supabase Authentication.
          Akun baru otomatis menjadi PIC, lalu role-nya bisa
          diubah menjadi ADMIN dari halaman ini.
        </p>
      </div>

      {message && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
          ✓ {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-black text-slate-900">
              Daftar Pengguna
            </h3>

            <p className="text-sm text-slate-500">
              ADMIN mempunyai akses monitoring penuh.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadUsers()
            }
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700"
          >
            ↻ Refresh
          </button>
        </div>

        <input
          type="search"
          value={search}
          onChange={(
            event,
          ) =>
            setSearch(
              event.target
                .value,
            )
          }
          placeholder="Cari nama / email / role..."
          className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Mengambil data user...
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredUsers.map(
              (item) => {
                const isMe =
                  item.user_id ===
                  userId;

                const busy =
                  updating ===
                  item.user_id;

                return (
                  <div
                    key={
                      item.user_id
                    }
                    className={[
                      "rounded-2xl border p-4",
                      item.active
                        ? "border-slate-200 bg-white"
                        : "border-red-200 bg-red-50",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-900">
                            {
                              item.name
                            }
                          </p>

                          {isMe && (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-700">
                              AKUN ANDA
                            </span>
                          )}

                          {!item.active && (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">
                              NONAKTIF
                            </span>
                          )}
                        </div>

                        <p className="mt-1 break-all text-sm text-slate-500">
                          {item.email ??
                            "Email tidak tersedia"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <select
                          value={
                            item.role
                          }
                          disabled={
                            busy ||
                            isMe
                          }
                          onChange={(
                            event,
                          ) =>
                            void changeRole(
                              item,
                              event.target
                                .value as UserRole,
                            )
                          }
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black disabled:bg-slate-100"
                        >
                          <option value="ADMIN">
                            ADMIN
                          </option>

                          <option value="PIC">
                            PIC
                          </option>
                        </select>

                        <button
                          type="button"
                          disabled={
                            busy ||
                            isMe
                          }
                          onClick={() =>
                            void toggleActive(
                              item,
                            )
                          }
                          className={[
                            "rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-40",
                            item.active
                              ? "bg-red-50 text-red-600"
                              : "bg-blue-600 text-white",
                          ].join(" ")}
                        >
                          {busy
                            ? "Memproses..."
                            : item.active
                              ? "Nonaktifkan"
                              : "Aktifkan"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              },
            )}

            {filteredUsers.length ===
              0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                User tidak ditemukan.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
