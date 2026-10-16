export type PokerTablePhase = 'WAITING' | 'BLINDS' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
export declare const usePokerStore: import("pinia").StoreDefinition<"poker", Pick<{
    phase: import("vue").Ref<PokerTablePhase, PokerTablePhase>;
    tableStack: import("vue").Ref<number, number>;
    pot: import("vue").Ref<number, number>;
    isSeated: import("vue").Ref<boolean, boolean>;
    sitIn: (buyInAmount: number) => void;
    leaveTable: () => void;
}, "phase" | "tableStack" | "pot" | "isSeated">, Pick<{
    phase: import("vue").Ref<PokerTablePhase, PokerTablePhase>;
    tableStack: import("vue").Ref<number, number>;
    pot: import("vue").Ref<number, number>;
    isSeated: import("vue").Ref<boolean, boolean>;
    sitIn: (buyInAmount: number) => void;
    leaveTable: () => void;
}, never>, Pick<{
    phase: import("vue").Ref<PokerTablePhase, PokerTablePhase>;
    tableStack: import("vue").Ref<number, number>;
    pot: import("vue").Ref<number, number>;
    isSeated: import("vue").Ref<boolean, boolean>;
    sitIn: (buyInAmount: number) => void;
    leaveTable: () => void;
}, "sitIn" | "leaveTable">>;
