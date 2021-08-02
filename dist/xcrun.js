const commander = require('commander');
const { Spawn } = require('./spawn');


exports.XcrunNotarize = XcrunNotarize;

// ダミーレスポンステスト
const IS_DUMMY = false;

const RETRY_MAX = 10;
const WAIT_TIME = IS_DUMMY ? 1000 * 3 : 1000 * 60;

/**
 * 公証処理
 * @param {commander.OptionValues} options 
 */
async function XcrunNotarize( options ) {
    return new Promise( async ( resolve, reject ) => {

        const isDMG = options.outputDmg ? true : false;

        // dmg優先
        const requestUUID = await XcrunNotarizeRequest( options, isDMG );

        // 公証完了待ち
        let notarizeResult = 1;
        for( let i = 1; i <= RETRY_MAX; i++ ) {
            console.log( `XcrunNotarizeWait UUID:${requestUUID} - ${i} try. wait ${parseInt(WAIT_TIME/1000,10)} second...` );
            await Sleep( WAIT_TIME );
            notarizeResult = await XcrunNotarizeWait( options, requestUUID, i );
            if( notarizeResult === 0 ) {
                break;
            }
        }

        if( notarizeResult !== 0 ) {
            reject( "XcrunNotarize failed." );
            return;
        }

        // 公証をステープルする
        XcrunNotarizeStaple( options, isDMG );

        resolve();
    });
}

/**
 * 公証リクエスト
 * @param {commander.OptionValues} options
 * @param {boolean} isDMG
 * @returns 
 */
 function XcrunNotarizeRequest( options, isDMG ) {
    return new Promise( async ( resolve, reject ) => {

        console.log( `XcrunNotarize request` );

        let result;
        
        // 公証
        if( !IS_DUMMY ) {
            result = Spawn('/usr/bin/xcrun', [
                'altool', '--notarize-app',
                '-t', 'osx',
                '-f', isDMG ? options.outputDmg : options.outputZip,
                '--primary-bundle-id', options.primaryBundleId,
                '-u', options.user, 
                '-p', options.password
            ]);
        } else {
            result = {
                status: 0,
                stdout: `No errors uploading ${isDMG ? options.outputDmg : options.outputZip}.\nRequestUUID = XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX\n`
            };
        }
        
        // コマンド失敗
        if( result.status !== 0 ) {
            reject('XcrunNotarize request command error');
            return;
        }
        
        let ruuidReg = result.stdout.toString().match( /RequestUUID.*?= (.*?)$/m );
        if( !ruuidReg || !ruuidReg[ 1 ] ) {
            reject('XcrunNotarize request UUID error');
            return;
        }
        
        const requestUUID = ruuidReg[1];
        console.log( `XcrunNotarize request success UUID:${requestUUID}` );

        resolve( requestUUID );
    });
}


/**
 * 公証が完了するのを待つ
 * @param {commander.OptionValues} options 
 * @param {string} requestUUID 
 * @param {number} count 
 */
async function XcrunNotarizeWait( options, requestUUID, count = 1 ) {
    return new Promise( async ( resolve, reject ) => {

        let result;

        if( !IS_DUMMY ){
            result = Spawn('/usr/bin/xcrun', [
                'altool', '--notarization-info',
                requestUUID,
                '-u', options.user, 
                '-p', options.password
            ]);
        } else {

            test = parseInt( Math.random() * 9, 10 );
            //console.debug( test );
        
            result = {
                status: 0,
                stdout: `No errors getting notarization info.

                Date: 2021-01-01 00:01:02 +0000
                Hash: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
          LogFileURL: http://dummy
         RequestUUID: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
              Status: success
         Status Code: 0
      Status Message: Package Approved
`
            }
        }

        // コマンドに失敗
        if( result.status !== 0 ) {
            reject( 'XcrunNotarizeWait command error' );
            return;
        }

        //　戻ってきた情報を取得
        const resultStr = result.stdout.toString();
        if( !resultStr || resultStr.length < 16/* 適当な長さ 通常出力に検索するまでもない文字数が無い時など */ ){
            reject( 'XcrunNotarizeWait command result error' );
            return;
        }

        // そもそものUUIDが出てこない (3回目ぐらいまではエラーとせずもう一度)
        if( !RegExp( `${requestUUID}`, "gm" ).test( resultStr ) ) {
            if( count < 3 ) {
                resolve( -2 );
                return;
            }
            reject( 'XcrunNotarizeWait error requestUUID not found' );
            return;
        }

        // 現在の状況を表示
        console.info( `---------------------` );
        console.info( `${resultStr}` );
        console.info( `---------------------` );

        // 公証が失敗
        if( RegExp( `Status: Invalid$`, "m" ).test( resultStr ) || RegExp( `Status Code: [^0]+$`, "m" ).test( resultStr ) ) {
            reject( 'XcrunNotarizeWait sign error' );
            return;            
        }

        // 公証が成功
        if( RegExp( `Status: success$`, "m" ).test( resultStr ) && RegExp( `Status Code: 0$`, "m" ).test( resultStr ) ) {
            console.log( `XcrunNotarizeWait ${requestUUID} - ${count} th success.` );
            resolve( 0 );
            return;
        }

        // 再起回数が指定回数を超えた
        if( count >= 10 ) {
            reject( 'XcrunNotarizeWait retry max error' );
            return;
        }
        
        // まだ終わってない?ので再度
        resolve( -1 );
    });
}

/**
 * 公証情報紐付け
 * @param {commander.OptionValues} options 
 * @param {boolean} isDMG
 */
function XcrunNotarizeStaple( options, isDMG ) {

    console.log( `XcrunNotarizeStaple` );

    if( !isDMG ) {

        console.info( `\tStapler is incapable of working with ZIP archive files.` );
        return;
    }

    let result;

    if( !IS_DUMMY ){
        result = Spawn('/usr/bin/xcrun', [
            'stapler', 'staple', 
            options.outputDmg
        ]);
    } else {
        result = {
            status: 0,
        }
    }

    if( result.status !== 0 ) {
        throw new Error( `XcrunNotarizeStaple error` );
    }

    console.log( `XcrunNotarizeStaple success` );
}



/**
 * sleep
 * @param {number} ms 
 * @returns 
 */
 function Sleep( ms ) {
    return new Promise( async ( resolve ) => {
        setTimeout( () => {
            resolve( );
        }, ms);
    });
}