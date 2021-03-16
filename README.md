# macos-app-sign

### macos アプリケーションの署名と公証を行います。

---


* nodejsが必要です。
 * キーチェーンアクセスに有効なApple Developerアカウントで発行した証明書の準備が必要です。

* ローカルインストール
<pre>
npm install git+https://github.com/wan0123/macos-app-sign.git
</pre>

* グローバルインストール
<pre>
npm install -g git+https://github.com/wan0123/macos-app-sign.git
</pre>


* appから公証済DMGを作成する場合

<pre>
macos-app-sign \
--app "[Application.app]" \
--output-dmg "[Output.dmg]" \
--sign "[Key Chain Name]" \
--entitlements "[ent.plist]" \
--primary-bundle-id "xx.xx.xxxx.xxxxx" \
--user "mac developer mail address" \
--password "Application password"
</pre>

* appから公証済ZIPを作成する場合

<pre>
macos-app-sign \
--app "[Application.app]" \
--output-zip "[Output.zip]" \
--sign "[Key Chain Name]" \
--entitlements "[ent.plist]" \
--primary-bundle-id "xx.xx.xxxx.xxxxx" \
--user "mac developer mail address" \
--password "Application password"
</pre>