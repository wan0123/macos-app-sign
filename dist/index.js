#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { program } = require('commander');
const commander = require('commander');

const { Spawn } = require('./spawn');
const { Appdmg } = require('./appdmg');
const { XcrunNotarize } = require('./xcrun');
const { Zip } = require('./zip');

// platform確認
const is_mac = process.platform==='darwin'

// MacOS 以外は動かない
if(!is_mac) {
    console.error("Not MacOS.");
    process.exit(1);
}

// 引数
program
    .requiredOption('--app <value>', 'app directory path', )
    .option('--output-dmg <value>', 'output dmg path', )
    .option('--dmg-spec-json <value>', 'appdmg spec json file path', )
    .option('--output-zip <value>', 'output zip path', )
    .requiredOption('--sign <value>', 'use key chain string', )
    .requiredOption('--entitlements <value>', 'entitlements plist file path', )
    .option('--primary-bundle-id <value>', '', )
    .option('--user <value>', 'Apple account user mail address', )
    .option('--password <value>', 'Application password', )

program
    .parse(process.argv);

const options = program.opts();

// 
if( !fs.statSync( options.app ).isDirectory() ) {
    console.error( `${options.app}` );
    process.exit( 1 );
}

//　
glob( `${options.app}/**/*`, async ( err, matches ) => {

    let signAppList = [];
    let signFileList = [];

    // 署名するファイルを全て検索
    for( const matche of matches ) {

        const stat = fs.statSync( matche );

        //　
        if( stat.isDirectory() ){ 
            if( 
                    matche.substr( matche.length - 4 ) === '.app' // directory名が .app で終わる
                &&  fs.existsSync( `${matche}/Contents/MacOS` ) === true // 指定のディレクトリが存在している
                &&  fs.statSync( `${matche}/Contents/MacOS` ).isDirectory() === true
            ) {
                signAppList.push( matche );
            }
            continue;
        }

        // ファイルの先頭8バイトチェック UnixBinと思われるもの
        const fileData = fs.readFileSync( matche, { encoding: "hex" } );
        const macOHeader = fileData.substr(0,8).toUpperCase();
        if( 
                macOHeader === "CFFAEDFE" 
            ||  macOHeader === "CAFEBABE" 
        ) {
            signFileList.push( matche );
        }
    }


    // app内 署名
    for( let i = 0; i < signFileList.length; i++ ) {
        Codesign( signFileList[i], options );
    }
    for( let i = 0; i < signAppList.length; i++ ) {
        Codesign( signAppList[i], options );
    }

    // app 署名確認
    if( !CodesineCheck( options.app ) ) {
        throw new Error("CodesineCheck Error.");
    }

    // dmg 
    if( options.outputDmg ) {
        // app dmg化
        await Appdmg( options );
        // dmg 署名
        Codesign( options.outputDmg, options );
    }

    // zip
    if( options.outputZip ) {   
        // app zip化
        await Zip( options );
    }

    // 公証
    if( options.primaryBundleId && options.user && options.password ) {
        await XcrunNotarize( options );
    } else {
        console.info("Skip notarize.");    
    }

    console.log("Finish.");
});


/**
 * 署名
 * @param {string} target 
 * @param {commander.OptionValues} options
 */
function Codesign( target, options ) {

    console.log( `Codesign: ${target}` );

    const result = Spawn('/usr/bin/codesign', [
        '--deep', 
        '--options', 'runtime', 
        '--timestamp', 
        '-s', options.sign, 
        '-f', 
        '--entitlements', options.entitlements,
        target,
    ]);

    // console.log(result);
    SpawnResultOutput( result );
}

/**
 * 署名チェック
 * @param {*} targetAppPath 
 */
function CodesineCheck( targetAppPath ) {

    console.log( `CodesineCheck: ${targetAppPath}` );

    const result = Spawn('/usr/bin/codesign', [
        '-vd', 
        targetAppPath,
    ]);

    SpawnResultOutput( result );

    const resultStr = result.stdout.toString();

    // ちゃんと署名されていない模様
    if( resultStr.indexOf(`Signature=adhoc`) >= 0 ) {
        return false;
    }
    return true;
}

/**
 * Spawnの結果の表示
 * @param {*} result 
 */
function SpawnResultOutput( result ) {

    if( !result ) return;

    if( result.stdout && result.stdout.length > 0 ) {
        // console.log( `-- out -----------------` );
        console.log( `  ${result.stdout.toString()}` );
    }
    if( result.stderr && result.stderr.length > 0 ) {
        // console.log( `-- err -----------------` );
        console.error( `  ${result.stderr.toString()}` );
    }
}