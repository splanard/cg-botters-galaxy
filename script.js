/* TODO:
 * - Implement second hero
 * - Change the health backing ratio if no health potions available !
 * - Change the potion buying algorithm (buy the more rentable on to cover health loss)
 * - Improve attack to gain more last hits
 * - Implement deny
 */

// Conf
var DISTANCE_FROM_BATTLE_FRONT = 100;
var HEALTH_BACK_RATIO = 0.20;

// Const
var AGGRO_DISTANCE = 300;
var MAX_ITEMS = 4;

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

var _boots = [];
var _gadgets = [];
var _potions = {
	'health': [],
	'mana': []
};
var _weapons = [];
var _items = [];
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
		else {
			_items.push( item );
		}
	}
	
	// Boots
	else if( item.name.includes( 'Boots' ) ){
		_boots.push( item );
	}
	// Gadgets
	else if( item.name.includes( 'Gadget' ) ){
		_gadgets.push( item );
	}
	// Weapons
	else if( item.name.includes( 'Blade' ) ){
		_weapons.push( item );
	}
	
	else {
		_items.push( item );
	}
}

// Sort potions
_potions.health.sort( function(a, b){ return a.health - b.health; } );
_potions.mana.sort( function(a, b){ return a.mana - b.mana; } );

// Sort items
_boots.sort( sortByCostAsc );
_gadgets.sort( sortByCostAsc );
_weapons.sort( sortByCostAsc );

// Giving ranks to items
for( var i=0; i < _boots.length; i++ ){
	_boots[i].rank = i;
}
for( var i=0; i < _gadgets.length; i++ ){
	_gadgets[i].rank = i;
}
for( var i=0; i < _weapons.length; i++ ){
	_weapons[i].rank = i;
}

//printErr( 'POTIONS: ' + stringify( _potions ) );
//printErr( 'BOOTS: ' + stringify( _boots ) );
//printErr( 'GADGETS: ' + stringify( _gadgets ) );
//printErr( 'WEAPONS: ' + stringify( _weapons ) );
//printErr( stringify( _items ) );

// game loop
var _myItems = {
	'boots': -1,
	'gadget': -1,
	'weapon': -1
};
var _itemsToSell = [];
var _gold, _availableGold, _mySide, _myHero, _myTower, _enemyHero, _enemyTower, _units, _battleFront;
while( true ){
    _gold = parseInt(readline());
	_availableGold = _gold - _potions.health[0].cost;
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
	
	// Sort units at range by asc health
	_units.atHeroRange.sort( function(a, b){
		return _units[a].health - _units[b].health;
	});
	
	// Hero selection
	if( roundType < 0 ){
		print('IRONMAN');
	}
	// Normal round
	else {		
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
	// Compute next items to buy and sell
	var nextItem, nextToSell;
	var rank = 0;
	while( nextItem === undefined ){
		if( _myItems.boots < rank ){
			nextItem = _boots[rank];
			nextItem.type = 'boots';
			if( _myItems.boots >= 0 ){
				nextToSell = _boots[_myItems.boots].name;
			}
		}
		else if( _myItems.weapon < rank ){
			nextItem = _weapons[rank];
			nextItem.type = 'weapon';
			if( _myItems.weapon >= 0 ){
				nextToSell = _weapons[_myItems.weapon].name;
			}
		}
		else if( _myItems.gadget < rank ){
			nextItem = _gadgets[rank];
			nextItem.type = 'gadget';
			if( _myItems.gadget >= 0 ){
				nextToSell = _gadgets[_myItems.gadget].name;
			}
		}
		rank++;
	}
	
	// Battle position
	var battlePosition = {
		'y': _enemyTower.y
	};
	if( _mySide === 'left' ){
		battlePosition.x = _battleFront - DISTANCE_FROM_BATTLE_FRONT;
	}
	else {
		battlePosition.x = _battleFront + DISTANCE_FROM_BATTLE_FRONT;
	}
	
	// Buy health potion if needed
	if( _myHero.health < _myHero.maxHealth * HEALTH_BACK_RATIO 
			&& _gold >= _potions.health[0].cost ){
		buy( _potions.health[0].name );
	}
	// If my hero is too weak or enemy hero too close: back to my tower
	else if( _myHero.health < _myHero.maxHealth * HEALTH_BACK_RATIO 
			|| atRange( _myHero, _enemyHero ) ){
		back();
	}
	// Sell items
	else if( _itemsToSell.length > 0 ){
		sell( _itemsToSell[0] );
		_itemsToSell.shift();
	}
	// Buy items
	else if( _availableGold >= nextItem.cost ){
		buy( nextItem.name );
		_myItems[nextItem.type] = nextItem.rank;
		if( nextToSell ){
			_itemsToSell.push( nextToSell );
		}
	}
	// Move the hero in battle position: just behind the front line but far enough from the enemy tower
	else if( distance( _myHero, battlePosition ) > 50 
			&& distance( battlePosition, _enemyTower ) > _enemyTower.attackRange ){
		move( battlePosition.x, battlePosition.y );
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

function back(){
	move( _myTower.x, _myTower.y, 'Back!' );
}

function buy( itemName ){
	print('BUY ' + itemName);
}

function move( x, y, msg ){
	if( msg ){
		print('MOVE ' + x + ' ' + y + ';' + msg);
	}
	else {
		print('MOVE ' + x + ' ' + y);
	}
}

function moveAttack( x, y, unitId ){
	print('MOVE_ATTACK ' + x + ' ' + y + ' ' + unitId);
}

function sell( itemName ){
	print('SELL ' + itemName);
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

function sortByCostAsc( a, b ){
	return a.cost - b.cost;
}

// Debug functions

function stringify( object ){
	return JSON.stringify( object, null, 2 );
}