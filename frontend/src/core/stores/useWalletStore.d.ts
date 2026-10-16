export declare const useWalletStore: import("pinia").StoreDefinition<"wallet", Pick<{
    balance: import("vue").Ref<number, number>;
    setBalance: (newBalance: number) => void;
    adjustBalance: (delta: number) => void;
}, "balance">, Pick<{
    balance: import("vue").Ref<number, number>;
    setBalance: (newBalance: number) => void;
    adjustBalance: (delta: number) => void;
}, never>, Pick<{
    balance: import("vue").Ref<number, number>;
    setBalance: (newBalance: number) => void;
    adjustBalance: (delta: number) => void;
}, "setBalance" | "adjustBalance">>;
