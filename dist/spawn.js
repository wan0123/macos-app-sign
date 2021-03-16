const cp = require('child_process');

exports.Spawn = Spawn;

/**
 * シェル実行
 * @param {*} exec 
 * @param {*} argv 
 */
 function Spawn( exec, argv ) {

	let spwanResult = cp.spawnSync( exec, argv );

    if( spwanResult.status !== 0 ) {
		throw new Error( spwanResult.stderr ? spwanResult.stderr.toString() : "error." );
	}

	if( spwanResult.stdout && spwanResult.stdout.toString() == '\n' ) {
		console.log( spwanResult.stdout.toString() );
	}
	if( spwanResult.stderr && spwanResult.stderr.toString() == '\n' ) {
		console.error( spwanResult.stderr.toString() );
	}
	
	return spwanResult;
}
