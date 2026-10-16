import type { User } from '@/core/types';
export declare const useAuthStore: import("pinia").StoreDefinition<"auth", Pick<{
    user: import("vue").Ref<{
        id: string;
        username: string;
        email: string;
        balance: number;
        avatarUrl?: string | undefined;
        createdAt?: string | undefined;
    } | null, User | {
        id: string;
        username: string;
        email: string;
        balance: number;
        avatarUrl?: string | undefined;
        createdAt?: string | undefined;
    } | null>;
    token: import("vue").Ref<string | null, string | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    setAuth: (newUser: User, jwtToken: string) => void;
    logout: () => void;
}, "user" | "token">, Pick<{
    user: import("vue").Ref<{
        id: string;
        username: string;
        email: string;
        balance: number;
        avatarUrl?: string | undefined;
        createdAt?: string | undefined;
    } | null, User | {
        id: string;
        username: string;
        email: string;
        balance: number;
        avatarUrl?: string | undefined;
        createdAt?: string | undefined;
    } | null>;
    token: import("vue").Ref<string | null, string | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    setAuth: (newUser: User, jwtToken: string) => void;
    logout: () => void;
}, "isAuthenticated">, Pick<{
    user: import("vue").Ref<{
        id: string;
        username: string;
        email: string;
        balance: number;
        avatarUrl?: string | undefined;
        createdAt?: string | undefined;
    } | null, User | {
        id: string;
        username: string;
        email: string;
        balance: number;
        avatarUrl?: string | undefined;
        createdAt?: string | undefined;
    } | null>;
    token: import("vue").Ref<string | null, string | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    setAuth: (newUser: User, jwtToken: string) => void;
    logout: () => void;
}, "setAuth" | "logout">>;
