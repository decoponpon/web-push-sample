// pushイベントハンドラを登録
self.addEventListener('push', (event) => {
  // 通知設定が行われているかをチェック
  if (!self.Notification || self.Notification.permission !== 'granted') {
    // 通知設定が行われていなければ何もせず終了
    return
  }

  // 送信されたデータを取得
  if (event.data) {
    const json = event.data.json()
    const options = {
      icon: './favicon.ico',
      body: json.body
    }
    event.waitUntil(self.registration.showNotification(json.title, options))
  }
})

// 表示された通知をクリックされた場合に発生するイベント
self.addEventListener('notificationclick', (event) => {
  console.log('通知がクリックされました')
  event.notification.close()
})
