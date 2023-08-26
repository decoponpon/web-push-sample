/// <reference lib="WebWorker" />
declare const self: ServiceWorkerGlobalScope;

import type {
    MessageDataFromServiceWorker,
    DataCustomExtendableMessageEvent
} from './types/messageData';
import { pushNum, incrementPushNum } from './pushNum';

// window 側と同じ channelName を引数に設定すること
const broadcastChannelForServiceWorker = new BroadcastChannel('service_worker_channel');

let pulsPushMessage = '';

// BroadcastChannel で window 側からデータを送る場合は下記で受け取る
// broadcastChannelForServiceWorker.addEventListener('message', (eventMessage: MessageEvent<MessageDataFromWindow>) => {
//     const data = eventMessage.data;
//     if (data) {
//         pulsPushMessage = eventMessage.data.pulsPushMessage;
//     }
// });

// postMessage された値を受け取る
self.addEventListener('message', (eventMessage: DataCustomExtendableMessageEvent) => {
    const data = eventMessage.data;
    if (data) {
        pulsPushMessage = data.pulsPushMessage;
    }
});

// pushイベントハンドラを登録
self.addEventListener('push', (event: PushEvent) => {
    // 通知設定が行われているかをチェック
    if (Notification.permission !== 'granted') {
        // 通知設定が行われていなければ何もせず終了
        return;
    }

    // 送信されたデータを取得
    if (event.data) {
        const json = event.data.json();
        const options = {
            icon: './favicon.ico',
            body: json.body + '\n' + pulsPushMessage
        };
        event.waitUntil(self.registration.showNotification(json.title, options));
        incrementPushNum();
        console.log(`${pushNum}`);

        // BroadcastChannel を使って Push 通知された回数を返す
        const message: MessageDataFromServiceWorker = { pushNum };
        broadcastChannelForServiceWorker.postMessage(message);
    }
});

// 表示された通知をクリックされた場合に発生するイベント
self.addEventListener('notificationclick', (event) => {
    console.log('通知がクリックされました');
    event.notification.close();
});

export type {};
