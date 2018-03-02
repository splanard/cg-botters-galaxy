var AGGRO_DISTANCE = 300;

var _myTeam = parseInt(readline());

var _bushes = [];
var bushAndSpawnPointCount = parseInt(readline()); // usefrul from wood1, represents the number of bushes and the number of places where neutral units can spawn
for( var i = 0; i < bushAndSpawnPointCount; i++ ){
    var inputs = readline().split(' ');
	_bushes.push({
		'type': inputs[0], // BUSH, from wood1 it can also be SPAWN
		'x': parseInt(inputs[1]),
		'y': parseInt(inputs[2]),
		'radius': parseInt(inputs[3])
	});
}

var _items = [];
var itemCount = parseInt(readline()); // useful from wood2
for( var i = 0; i < itemCount; i++ ){
    var inputs = readline().split(' ');
	_items.push({
		'name': inputs[0], // contains keywords such as BRONZE, SILVER and BLADE, BOOTS connected by "_" to help you sort easier
		'cost': parseInt(inputs[1]), // BRONZE items have lowest cost, the most expensive items are LEGENDARY
		'damage': parseInt(inputs[2]), // keyword BLADE is present if the most important item stat is damage
		'health': parseInt(inputs[3]),
		'maxHealth': parseInt(inputs[4]),
		'mana': parseInt(inputs[5]),
		'maxMana': parseInt(inputs[6]),
		'moveSpeed': parseInt(inputs[7]), // keyword BOOTS is present if the most important item stat is moveSpeed
		'manaRegeneration': parseInt(inputs[8]),
		'isPotion': parseInt(inputs[9]) // 0 if it's not instantly consumed
	});
}

// game loop
var _mySide, _myHero, _enemyHero, _myTower, _enemyTower, _units, _battleFront;
while( true ){
    var gold = parseInt(readline());
    var enemyGold = parseInt(readline());
    var roundType = parseInt(readline()); // a positive value will show the number of heroes that await a command
    
	// Init enemy front coordinate
	if( _mySide === 'left' ){
		_battleFront = 100;
	} else {
		_battleFront = 1820;
	}
	
	_units = {
		'all': [],
		'atHeroRange': [],
		'canAggroHero': [],
		'threatenHero': []
	};
	var entityCount = parseInt(readline());
    for( var i = 0; i < entityCount; i++ ){
        var inputs = readline().split(' ');
		var u = {
			'id': parseInt(inputs[0]),
			'team': parseInt(inputs[1]),
			'unitType': inputs[2], // UNIT, HERO, TOWER, can also be GROOT from wood1
			'x': parseInt(inputs[3]),
			'y': parseInt(inputs[4]),
			'attackRange': parseInt(inputs[5]),
			'health': parseInt(inputs[6]),
			'maxHealth': parseInt(inputs[7]),
			'shield': parseInt(inputs[8]), // useful in bronze
			'attackDamage': parseInt(inputs[9]),
			'movementSpeed': parseInt(inputs[10]),
			'stunDuration': parseInt(inputs[11]), // useful in bronze
			'goldValue': parseInt(inputs[12])
		};
		
		// Heroes
		if( u.unitType === 'HERO' ){
			u.countDown1 = parseInt(inputs[13]); // all countDown and mana variables are useful starting in bronze
			u.countDown2 = parseInt(inputs[14]);
			u.countDown3 = parseInt(inputs[15]);
			u.mana = parseInt(inputs[16]);
			u.maxMana = parseInt(inputs[17]);
			u.manaRegeneration = parseInt(inputs[18]);
			u.heroType = inputs[19]; // DEADPOOL, VALKYRIE, DOCTOR_STRANGE, HULK, IRONMAN
			u.isVisible = parseInt(inputs[20]); // 0 if it isn't
			u.itemsOwned = parseInt(inputs[21]); // useful from wood1
			
			// My hero
			if( u.team === _myTeam ){
				_myHero = u;
			}
			// Enemy hero
			else {
				_enemyHero = u;
			}
		}
		
		// Towers
		else if( u.unitType === 'TOWER' ){
			// My tower
			if( u.team === _myTeam ){
				_myTower = u;
				
				if( _myTower.x === 100 ){
					_mySide = 'left';
				} else {
					_mySide = 'right';
				}
			}
			// Enemy tower
			else {
				_enemyTower = u;
			}
		}
		
		// Units
		else if( u.unitType === 'UNIT' ){
			_units[u.id] = u;
			_units.all.push(u.id);
			
			// Ally units...
			if( u.team === _myTeam ){ 
				// Battle front
				if( ( _mySide === 'left' && u.x > _battleFront ) 
						|| ( _mySide === 'right' && u.x < _battleFront ) ){
					_battleFront = u.x;
				}
			}
			// Enemy units...
			else {
				// ... at range of my hero
				if( atRange( u, _myHero ) ){
					_units.atHeroRange.push( u.id );
				}
				// ... threatening my hero
				if( atRange( _myHero, u ) ){
					_units.threatenHero.push( u.id );
				}
				// .. which can aggro my hero
				if( distance( _myHero, u ) <= AGGRO_DISTANCE ){
					_units.canAggroHero.push( u.id );
				}
			}
			
		}
    }
	
	// Hero selection
	if( roundType < 0 ){
		print('IRONMAN');
	}
	// Normal round
	else {
		printErr('Enemy front: ' + _battleFront);
		switch( _myHero.heroType ){
			case 'DEADPOOL':
				deadpool();
				break;
			
			case 'DOCTOR_STRANGE':
				doctorStrange();
				break;
				
			case 'HULK':
				hulk();
				break;
			
			case 'IRONMAN':
				ironman();
				break;
				
			case 'VALKYRIE':
				valkyrie();
				break;
		}
	}
}

// Heroes function

function deadpool(){
	
}

function doctorStrange(){
	
}

function hulk(){
	
}

function ironman(){
	// If my hero is too weak or enemy hero too close: back to my tower
	if( _myHero.health < _myHero.maxHealth / 4 || atRange( _myHero, _enemyHero ) ){
		move( _myTower.x, _myTower.y );
	}
	// If my hero has move too much forward: back
	else if( ( _mySide === 'left' && _myHero.x !== _battleFront - 100 )
			|| ( _mySide === 'right' && _myHero.x !== _battleFront + 100 ) ){
		if( _mySide === 'left' ){
			move( _battleFront - 100, _enemyTower.y );
		}
		else {
			move( _battleFront + 100, _enemyTower.y );
		}
	}
	// Enemy hero at range and no units can aggro: attack
	else if( atRange( _enemyHero, _myHero ) && _units.canAggroHero.length === 0 ){
		attack( _enemyHero.id );
	}
	// If a unit at range: attack
	else if( _units.atHeroRange.length > 0 ){
		attack( _units.atHeroRange[0] );
	}
	// Else, wait
	else {
		wait();
	}
}

function valkyrie(){
	
}

// Action functions

function attack( unitId ){
	print('ATTACK ' + unitId);
}

function attackNearest( unitType ){
	print('ATTACK_NEAREST ' + unitType);
}

function move( x, y ){
	print('MOVE ' + x + ' ' + y);
}

function moveAttack( x, y, unitId ){
	print('MOVE_ATTACK ' + x + ' ' + y + ' ' + unitId);
}

function wait(){
	print('WAIT');
}

// Utility functions

function atRange( entity, from ){
	return distance( entity, from ) < from.attackRange;
}

function distance( e1, e2 ){
	return Math.sqrt( Math.pow( e2.x - e1.x, 2 ) + Math.pow( e2.y - e1.y, 2 ) );
}