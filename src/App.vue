<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type {
    MessageDataFromServiceWorker,
    MessageDataFromWindow
} from './worker/types/messageData';

type GetPublicKeyResponse = {
    publicKey: string;
};

// Service Worker とデータのやり取りをするための BroadcastChannel (https://developer.mozilla.org/ja/docs/Web/API/BroadcastChannel)
// Service Worker へのデータの送信は ServiceWorker.postMessage() でも可能(https://developer.mozilla.org/ja/docs/Web/API/ServiceWorker/postMessage)
// MessageChannel を使っても同様にデータのやり取りができるが、 BroadcastChannel は同一オリジンでのやり取りに限定されるのでこちらを使用
const broadcastChannelForServiceWorker = new BroadcastChannel('service_worker_channel');

let subscriptionJson: PushSubscriptionJSON | null = null;
let vapidPublicKey = '';
let serviceWorker: ServiceWorker | null = null;

const pulsPushMessage = ref('');
const pushNum = ref(0);

/**
 * 公開鍵(base64)をUint8Arrayに変換する(subscribeの引数用)
 */
const urlB64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

/**
 * バックエンドを介して Push 通知を送る
 * リクエスト前に Service Worker に必要なデータを送信
 */
const sendPushMessage = async () => {
    if (!serviceWorker) {
        window.alert('Service Worker が登録されていません');
        return;
    }
    // ServiceWorker.postMessage() でデータを送信
    const message: MessageDataFromWindow = {
        pulsPushMessage: pulsPushMessage.value
    };
    serviceWorker.postMessage(message);
    // BroadcastChannel で送る場合は下記
    // broadcastChannelForServiceWorker.postMessage({ pulsPushMessage: pulsPushMessage.value });

    fetch('http://localhost:4000/web-push', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
        },
        body: JSON.stringify(subscriptionJson)
    });
};

const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
        return;
    }
    // Service Worker を登録する
    let serviceWorkerRegistration: ServiceWorkerRegistration;
    try {
        // NOTE: type: module を指定することで ES Modules のスクリプトを利用できる
        // NOTE: Safari でも動くか要確認
        serviceWorkerRegistration = await navigator.serviceWorker.register(
            '/worker/service_worker.js',
            {
                type: 'module'
            }
        );
        console.log('Service Worker is registerd', serviceWorkerRegistration);
    } catch (e) {
        console.error(`Service Worker registration failed`, e);
        return;
    }

    // Service Worker が activate されたら Push 通知を購読する
    serviceWorker = serviceWorkerRegistration.installing;
    if (serviceWorkerRegistration.waiting) {
        serviceWorker = serviceWorkerRegistration.waiting;
    } else if (serviceWorkerRegistration.active) {
        serviceWorker = serviceWorkerRegistration.active;
    }
    serviceWorker?.addEventListener('statechange', async () => {
        if (!serviceWorker || serviceWorker.state !== 'activated') {
            return;
        }
        const options = {
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
        };
        let subscription;
        try {
            subscription = await serviceWorkerRegistration.pushManager.subscribe(options);
        } catch (e) {
            console.log(`Push通知の購読に失敗しました`, e);
            return;
        }
        subscriptionJson = subscription.toJSON();
        // Push通知表示を許可するための確認を表示
        Notification.requestPermission((permission) => {
            console.log(permission); // 'default', 'granted', 'denied'
        });
    });
};

const handleMessageFromServiceWorker = (event: MessageEvent<MessageDataFromServiceWorker>) => {
    pushNum.value = event.data.pushNum;
};

onMounted(async () => {
    // 公開キーを取得
    const response: GetPublicKeyResponse = await fetch('http://localhost:4000/public-key', {
        method: 'GET',
        headers: {
            'content-type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:5173'
        }
    }).then((res) => res.json());
    vapidPublicKey = response.publicKey;

    // 登録済みの service worker 及び、購読済みの push manager を削除
    const registeredServiceWorkerList = await navigator.serviceWorker.getRegistrations();
    for (const registeredSW of registeredServiceWorkerList) {
        const subscribedPushManger = await registeredSW.pushManager.getSubscription();
        await subscribedPushManger?.unsubscribe();
        await registeredSW.unregister();
        console.log('既存の service worker 登録解除');
    }

    // Service Worker から postMessage されたときの処理を登録
    broadcastChannelForServiceWorker.onmessage = handleMessageFromServiceWorker;
});
</script>

<template>
    <header>
        <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />
    </header>

    <div class="wrapper">
        <div>Push 通知回数: {{ pushNum }}</div>
        <label>
            Push 通知 プラスα メッセージ
            <input type="text" v-model="pulsPushMessage" />
        </label>
        <button @click="registerServiceWorker">ServiceWorker登録</button>
        <button @click="sendPushMessage">Push通知送信</button>
    </div>
</template>

<style scoped>
header {
    line-height: 1.5;
    max-height: 100vh;
}

.logo {
    display: block;
    margin: 0 auto 2rem;
}

.wrapper {
    display: flex;
    flex-direction: column;
    place-items: flex-start;
    flex-wrap: wrap;
}

@media (min-width: 1024px) {
    header {
        display: flex;
        place-items: center;
        padding-right: calc(var(--section-gap) / 2);
    }

    .logo {
        margin: 0 2rem 0 0;
    }
}
</style>
./worker/types/messageData
