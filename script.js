/* TODO:
 * - Refactor all the items management code...
 * - Change the health backing ratio if no health potions available !
 * - Change the potion buying algorithm (buy the more rentable on to cover health loss)
 * - Improve attack to gain more last hits
 * - Implement deny
 */

// Const
var AGGRO_DISTANCE = 300;
var MAX_ITEMS = 4;

var _myTeam = parseInt(readline());

// BUSHES INPUT
var _bushes = [];
var bushAndSpawnPointCount = parseInt(readline()); // usefrul from wood1, represents the number of bushes and the number of places where neutral units can spawn
for( var i = 0; i < bushAndSpawnPointCount; i++ ){
    var inputs = readline().split(' ');
	_bushes.push({
		'type': inputs[0], // BUSH, from wood1 it can also be SPAWN
		'xo': parseInt(inputs[1]),
		'y': parseInt(inputs[2]),
		'radius': parseInt(inputs[3])
	});
}

// ITEMS INPUT
var _itemSets = {
	'laneRange': []
};
var _potions = {
	'health': [],
	'mana': []
};
var _items = {};
var itemCount = parseInt(readline()); // useful from wood2
for( var i = 0; i < itemCount; i++ ){
    var inputs = readline().split(' ');
	var item = {
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
	};
	
	// Potions
	if( item.isPotion ){
		if( item.health > 0 ){
			_potions.health.push( item );
		}
		else if( item.mana > 0 ){
			_potions.mana.push( item );
		}
	}
	
	// LaneRange role need moveSpeed and damage
	if( item.damage > 0 || item.moveSpeed > 0 ){
		_itemSets.laneRange.push( item.name );
	}
	
	_items[item.name] = item;
}

// Sort potions
_potions.health.sort( function(a, b){ return a.health - b.health; } );
_potions.mana.sort( function(a, b){ return a.mana - b.mana; } );

// Sort item sets by asc cost
_itemSets.laneRange.sort( sortItemsByCostAsc );

//printErr( stringify( _items ) );

// GAME LOOP
var _round = -2;
var _myItems = {};
var _roles = {};
var _gold, _availableGold, _mySide, _myHeroes, _myTower, _enemyHeroes, _enemyTower, _units, _myFront, _enemyFront;
var _myHeroesPrevious = [{ 'health': 0 }, { 'health': 0 }];
while( true ){
    // Gold input
	_gold = parseInt(readline());
	_availableGold = _gold - _potions.health[0].cost;
    var enemyGold = parseInt(readline());
    
	// Round type
	var roundType = parseInt(readline()); // a positive value will show the number of heroes that await a command
    
	// Init battle fronts coordinates
	_myFront = 100;
	_enemyFront = 1820;
	
	// Units input
	_units = {};
	_myHeroes = [];
	_enemyHeroes = [];
	var entityCount = parseInt(readline());
    for( var i = 0; i < entityCount; i++ ){
        var inputs = readline().split(' ');
		var u = {
			'id': parseInt(inputs[0]),
			'team': parseInt(inputs[1]),
			'unitType': inputs[2], // UNIT, HERO, TOWER, can also be GROOT from wood1
			'x': convertX( parseInt(inputs[3]) ),
			'xo': parseInt(inputs[3]),
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
		
		u.isRanged = (u.attackRange >= 150);
		
		// Towers
		if( u.unitType === 'TOWER' ){
			// My tower
			if( u.team === _myTeam ){
				_myTower = u;
			}
			// Enemy tower
			else {
				_enemyTower = u;
			}
		}
		
		// Heroes
		else if( u.unitType === 'HERO' ){
			u.countDown1 = parseInt(inputs[13]); // all countDown and mana variables are useful starting in bronze
			u.countDown2 = parseInt(inputs[14]);
			u.countDown3 = parseInt(inputs[15]);
			u.mana = parseInt(inputs[16]);
			u.maxMana = parseInt(inputs[17]);
			u.manaRegeneration = parseInt(inputs[18]);
			u.name = inputs[19]; // DEADPOOL, VALKYRIE, DOCTOR_STRANGE, HULK, IRONMAN
			u.isVisible = parseInt(inputs[20]) > 0; // 0 if it isn't
			u.itemsOwned = parseInt(inputs[21]); // useful from wood1
			u.attackSpeed = 0.1;
			
			// My hero
			if( u.team === _myTeam ){
				u.enemyUnitsAtRange = []; // IDs of all enemy units at range
				u.enemyHeroesAtRange = []; // IDs of all enemy heroes at range
				u.threateningUnits = []; // IDs of all enemy units from which my hero is at range
				u.threateningHeroes = []; //IDs of all enemy heroes from which my hero is at range
				u.enemyUnitsCanAggro = []; // IDs of all the enemy units which can aggro my hero
				
				u.underAttack = ( u.health < _myHeroesPrevious[_myHeroes.length].health );
				
				_myHeroes.push(u);
			}
			// Enemy hero
			else {
				_enemyHeroes.push(u);
			}
		}
		
		// Units
		else if( u.unitType === 'UNIT' ){
			u.attackSpeed = 0.2;			
			
			// Ally units...
			if( u.team === _myTeam ){ 
				// Battle front
				if( u.x > _myFront ){
					_myFront = u.x;
				}
			}
			// Neutral units...
			else if( u.unitType === 'GROOT' ){
				// TODO
			}
			// Enemy units...
			else {
				// Battle front
				if( u.x < _enemyFront ){
					_enemyFront = u.x;
				}
				
				// Interactions with my heroes
				for( var hid=0; hid < _myHeroes.length; hid++ ){
					var hero = _myHeroes[hid];
					// unit at range of my hero
					if( isAtRange( u, hero ) ){
						hero.enemyUnitsAtRange.push( u.id );
					}
					// unit threatening my hero
					if( isAtRange( hero, u ) ){
						hero.threateningUnits.push( u.id );
					}
					// unit which can aggro my hero
					if( distance( hero, u ) <= AGGRO_DISTANCE ){
						hero.enemyUnitsCanAggro.push( u.id );
					}
				}
			}
			
			_units[u.id] = u;
		}
    }
	
	// Normal round
	if( roundType >= 0 ){
		for( var i=0; i < _myHeroes.length; i++ ){
			// Compute enemy heroes at range
			for( var j=0; j < _enemyHeroes.length; j++ ){
				var eh = _enemyHeroes[j];
				// Enemy hero is at mines's attack range
				if( isAtRange( eh, _myHeroes[i] ) ){
					_myHeroes[i].enemyHeroesAtRange.push( eh.id );
				}
				// Enemy hero is threatening mine
				if( willBeAtRange( _myHeroes[i], eh ) ){
					_myHeroes[i].threateningHeroes.push( eh.id );
				}
			}
			
			// Sort potential targets by asc health
			_myHeroes[i].enemyUnitsAtRange.sort( sortByHealthAsc );
			_myHeroes[i].enemyHeroesAtRange.sort( sortByHealthAsc );
		}
		
		// Action
		for( var i=0; i < _myHeroes.length; i++ ){
			_roles[_myHeroes[i].name](i);
		}
		
		// Keep previous run state
		_myHeroesPrevious = _myHeroes.slice();
	}
	// Hero selection round
	else {
		// Hero selection
		var hero;
		if( _round === -2 ){
			hero = 'IRONMAN';
			_roles[hero] = laneRange;
		}
		else if( _round === -1 ){
			hero = 'DOCTOR_STRANGE';
			_roles[hero] = laneRange;
		}
		print( hero );
		
		// Items init
		_myItems[hero] = {
			'list': [],
			'maxRank': -1
		};
		
		// Compute side
		if( !_mySide &&_myTower.x === 100 ){
			_mySide = 'LEFT';
		}
		else if( !_mySide ){
			_mySide = 'RIGHT';
		}
	}
	
	_round++;
}

// Roles function

function laneRange( heroIdx ){
	var hero = _myHeroes[heroIdx];
	//printErr( '> ' + hero.name );
	
	// Role conf
	var HEALTH_RATIO_BACK = 0.5;
	var HEALTH_RATIO_POTION = 0.3;
	var MIN_DISTANCE_FROM_MY_FRONT = 100;
	
	// Next item to buy
	var nextItem = _items[_itemSets.laneRange[_myItems[hero.name].maxRank + 1]];
	//printErr( 'Next item to buy: ' + nextItem.name + '(' + nextItem.cost + ')' );
	
	// Battle position
	var battlePosition = {
		'x': Math.max( _myTower.x, Math.min( _myFront - MIN_DISTANCE_FROM_MY_FRONT, _enemyFront - hero.attackRange ) ),
		'y': _enemyTower.y
	};
	
	// ---
	// Buy health potion if needed
	if( hero.health < hero.maxHealth * HEALTH_RATIO_POTION 
			&& _gold >= _potions.health[0].cost ){
		buy( _potions.health[0] );
	}
	// ---
    // If my hero is weak or under attack: fall back if possible or fight.
	else if( hero.health < hero.maxHealth * HEALTH_RATIO_BACK || hero.underAttack ){
		// My hero is already at the tower...
		if( hero.x <= _myTower.x ){
			// Enemy heroes at range and not too much enemy units around: attack hero
			if( hero.enemyHeroesAtRange.length > 0 && hero.enemyUnitsCanAggro.length < 2 ){
				attack( hero.enemyHeroesAtRange[0] );
			}
			// Enemy units at range: attack them
			else if( hero.enemyUnitsAtRange.length > 0 ){
				attack( hero.enemyUnitsAtRange[0] );
			}
			// No enemies at range: if not under attack, move a bit ahead...
			else if( !hero.underAttack && hero.threateningHeroes.length === 0 ){
				move( battlePosition.x, battlePosition.y );
			}
			// Under attack: try to move a bit further away
			else {
				move( 0, _myTower.y );
			}
		}
		// Back to the tower !
		else {
			back();
		}
	}
	// Full of items: sell the lesser one
	else if( hero.itemsOwned === MAX_ITEMS ){
		sell( _items[_myItems[hero.name].list.shift()] );
	}
	// Buy items
	else if( _availableGold >= nextItem.cost ){
		buy( nextItem );
		_myItems[hero.name].list.push( nextItem.name );
		_myItems[hero.name].maxRank++;
	}
	// Move the hero in battle position: just behind the front line but far enough from the enemy tower
	else if( distance( hero, battlePosition ) > 50 
			&& distance( battlePosition, _enemyTower ) > _enemyTower.attackRange ){
		move( battlePosition.x, battlePosition.y );
	}
	// Enemy hero at range and no units can aggro: attack
	else if( hero.enemyHeroesAtRange.length > 0 && hero.enemyUnitsCanAggro.length === 0 ){
		attack( hero.enemyHeroesAtRange[0] );
	}
	// If a unit at range: attack
	else if( hero.enemyUnitsAtRange.length > 0 ){
		attack( hero.enemyUnitsAtRange[0] );
	}
	// Else, wait
	else {
		wait();
	}
}

// Action functions

function attack( unitId ){
	print('ATTACK ' + unitId + ';Attack');
}

function attackNearest( unitType ){
	print('ATTACK_NEAREST ' + unitType);
}

function back(){
	move( _myTower.x, _myTower.y, 'Back!' );
}

function buy( item ){
	print('BUY ' + item.name + ';+' + item.name);
	changeGold( -item.cost );
}

function move( x, y, msg ){
	if( msg ){
		print('MOVE ' + convertX(x) + ' ' + y + ';' + msg);
	}
	else {
		print('MOVE ' + convertX(x) + ' ' + y);
	}
}

function moveAttack( x, y, unitId ){
	print('MOVE_ATTACK ' + convertX(x) + ' ' + y + ' ' + unitId);
}

function sell( item ){
	print('SELL ' + item.name);
	changeGold( item.cost );
}

function wait(){
	print('WAIT');
}

// Utility functions

function isAtRange( entity, from ){
	return distance( entity, from ) <= from.attackRange;
}

function willBeAtRange( entity, from ){
	var dangerDistance;
	if( from.isRanged ){
		dangerDistance = from.attackRange + from.movementSpeed * (1 - 2 * from.attackSpeed);
	} else {
		dangerDistance = from.attackRange + from.movementSpeed * (1 - from.attackSpeed);
	}
	return distance( entity, from ) <= dangerDistance;
}

function changeGold( delta ){
	_gold += delta;
	_availableGold = _gold - _potions.health[0].cost;
}

function convertX( x ){
	if( _mySide === 'RIGHT' ){
		return 1920 - x;
	} else {
		return x;
	}
}

function distance( e1, e2 ){
	return Math.floor( Math.sqrt( Math.pow( e2.x - e1.x, 2 ) + Math.pow( e2.y - e1.y, 2 ) ) );
}

function sortItemsByCostAsc( a, b ){
	return _items[a].cost - _items[b].cost;
}

function sortByHealthAsc( a, b ){
	return a.health - b.health;
}

// Debug functions

function stringify( object ){
	return JSON.stringify( object, null, 2 );
}