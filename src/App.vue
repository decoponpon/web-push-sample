<script setup lang="ts">
import { onMounted } from 'vue';

type GetPublicKeyResponse = {
    publicKey: string;
};

let subscriptionJson: PushSubscriptionJSON | null = null;
let vapidPublicKey = '';

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

const sendPushMessage = async () => {
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
        serviceWorkerRegistration = await navigator.serviceWorker.register(
            '/worker/service_worker.js'
        );
        console.log('Service Worker is registerd', serviceWorkerRegistration);
    } catch (e) {
        console.error(`Service Worker registration failed`, e);
        return;
    }

    // Service Worker が activate されたら Push 通知を購読する
    let serviceWorker = serviceWorkerRegistration.installing;
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
});
</script>

<template>
    <header>
        <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

        <div class="wrapper">
            <button @click="registerServiceWorker">ServiceWorker登録</button>
            <button @click="sendPushMessage">Push通知送信</button>
        </div>
    </header>
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

nav {
    width: 100%;
    font-size: 12px;
    text-align: center;
    margin-top: 2rem;
}

nav a.router-link-exact-active {
    color: var(--color-text);
}

nav a.router-link-exact-active:hover {
    background-color: transparent;
}

nav a {
    display: inline-block;
    padding: 0 1rem;
    border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
    border: 0;
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

    header .wrapper {
        display: flex;
        place-items: flex-start;
        flex-wrap: wrap;
    }

    nav {
        text-align: left;
        margin-left: -1rem;
        font-size: 1rem;

        padding: 1rem 0;
        margin-top: 1rem;
    }
}
</style>
