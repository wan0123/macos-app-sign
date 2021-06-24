const fs = require('fs');
const path = require('path');
const appdmg = require('appdmg');
const commander = require('commander');
const { trace } = require('console');

exports.Appdmg = Appdmg;


/**
 * app を dmg にする
 * @param {commander.OptionValues}
 */
 function Appdmg( options ) {
    return new Promise( ( resolve, reject ) => {

        console.log( `AppDmg: ${options.app} => ${options.outputDmg}` );

        // 既に存在する場合は削除
        if( fs.existsSync( options.outputDmg ) ) {
            fs.unlinkSync( options.outputDmg );
        }

        const targetAPP = path.resolve( options.app );
        const targetAppParse = path.parse( targetAPP );

        let specification = {
            title: targetAppParse.base,
            contents: [
                { x: 192, y: 344, type: "file", path: targetAppParse.base },
                { x: 448, y: 344, type: "link", path: "/Applications" },
            ]
        };

        if( options.dmgSpecJson ) {
            var specJson = JSON.parse( fs.readFileSync( options.dmgSpecJson ) );
            console.log( specJson );
            specification = specJson;
        }

        const ee = appdmg({ 
            target: options.outputDmg,
            basepath: targetAppParse.dir,
            specification: specification
        });

        ee.on('progress', ( info ) => {
        //  console.log( parseInt( info.current / info.total * 100, 10 ) + "%" );
            if( info.title ) console.log( `  ${info.title}` );
        });
        ee.on('finish', () => {
            resolve();
        });
        ee.on('error', ( err ) => {
            reject( err );
        });
    });
}

