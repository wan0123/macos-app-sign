const fs = require('fs');
const path = require('path');
const commander = require('commander');
const { Spawn } = require('./spawn');

exports.Zip = Zip;


/**
 * app を zip にする
 * @param {commander.OptionValues}
 */
 function Zip( options ) {
    return new Promise( ( resolve, reject ) => {

        console.log( `Zip: ${options.app} => ${options.outputZip}` );

        // 既に存在する場合は削除
        if( fs.existsSync( options.outputZip ) ) {
            fs.unlinkSync( options.outputZip );
        }

        const targetAPP = path.resolve( options.app );
        const targetAppParse = path.parse( targetAPP );
        const outputZipParse = path.parse( options.outputZip );

        const cwd = process.cwd();

        try {

            process.chdir( targetAppParse.dir );

            Spawn( 'zip', [
                '-ry', outputZipParse.base,
                targetAppParse.base, '-x', '*/.DS_Store'
            ]);

            process.chdir( cwd );

        } catch( err ) {

            reject( err );
            process.chdir( cwd );
            return;
        } 

        resolve();

    });

}

