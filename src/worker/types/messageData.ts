export type MessageDataFromWindow = {
    pulsPushMessage: string;
};

export type MessageDataFromServiceWorker = {
    pushNum: number;
};

// ExtendableMessageEvent を拡張して data を any から型定義
export interface DataCustomExtendableMessageEvent extends ExtendableMessageEvent {
    data: MessageDataFromWindow | undefined;
}

