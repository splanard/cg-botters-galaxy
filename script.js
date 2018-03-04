/* TODO:
 * - Change the health backing ratio if no health potions available !
 * - Change the potion buying algorithm (buy the more rentable on to cover health loss)
 * - Improve attack to gain more last hits
 * - Implement deny
 */

// Const
var AGGRO_DISTANCE = 300;
var LANE_HEIGHT = 300;
var MAX_ITEMS = 4;

var _myTeam = parseInt(readline());

// BUSHES & SPAWN POINTS INPUT
var _bushes = [];
var _spawnPoints = [];
var bushAndSpawnPointCount = parseInt(readline()); // usefrul from wood1, represents the number of bushes and the number of places where neutral units can spawn
for( var i = 0; i < bushAndSpawnPointCount; i++ ){
    var inputs = readline().split(' ');
	var point = {
		'xo': parseInt(inputs[1]),
		'x': convertX( parseInt(inputs[1]) ),
		'y': parseInt(inputs[2]),
		'radius': parseInt(inputs[3])
	};
	
	// Bush
	if( inputs[0] === 'BUSH' ){
		_bushes.push( point );
	}
	// Spawn point
	else {
		_spawnPoints.push( point );
	}
}

// ITEMS INPUT
var _itemSets = {
	'farmer': [],
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
	
	// LaneRange role needs full damage and mana / mana regen (for Ironman's skills)
	if( item.damage > 0 || item.mana > 0 || item.manaRegeneration > 0 ){
		_itemSets.laneRange.push( item.name );
	}
	// Farmer role needs damage, moveSpeed and health
	var farmerScore = 0;
	if( item.damage > 0 ){ farmerScore++; }
	if( item.health > 0 ){ farmerScore++; }
	if( item.moveSpeed > 0 ){ farmerScore++; }
	if( farmerScore >= 2 ){
		_itemSets.farmer.push( item.name );
	}
	
	_items[item.name] = item;
}

// Sort potions
_potions.health.sort( function(a, b){ return a.health - b.health; } );
_potions.mana.sort( function(a, b){ return a.mana - b.mana; } );

// Sort item sets by asc cost
_itemSets.laneRange.sort( sortItemsByCostAsc );
_itemSets.farmer.sort( sortItemsByCostAsc );

//printErr( stringify( _items ) );

// SKILLS
// Init skill cooldowns
var _skills = ['BLINK', 'BURNING', 'FIREBALL'];
var _cooldowns = {};
for( var i=0; i < _skills.length; i++ ){
	_cooldowns[_skills[i]] = 0;
}

// GAME LOOP
var _round = -2;
var _myItems = {};
var _roles = {};
var _gold, _availableGold, _mySide, _myHeroes, _myTower, _enemyHeroes, _enemyTower, _units, _neutrals, _enemies, _myFront, _enemyFront;
var _previousState = {
	'myHeroes': [{ 'health': 0 }, { 'health': 0 }],
	'myTower' : { 'health': 0 }
};
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
	
	// Reduce cooldowns
	for( var i=0; i < _skills.length; i++ ){
		if( _cooldowns[_skills[i]] > 0 ){
			_cooldowns[_skills[i]]--;
		}
	}
	
	// Units input
	_units = {};
	_neutrals = [];
	_enemies = [];
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
				u.underAttack = ( u.health < _previousState.myTower.health );
				
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
				u.neutralUnitsAtRange = [];
				
				u.underAttack = ( u.health < _previousState.myHeroes[_myHeroes.length].health );
				
				_myHeroes.push(u);
			}
			// Enemy hero
			else {
				_enemyHeroes.push(u);
				_enemies.push(u.id);
			}
		}
		
		// Groots
		else if( u.unitType === 'GROOT' ){
			u.attackSpeed = 0.2;
			
			// At range of my hero ?
			for( var hid=0; hid < _myHeroes.length; hid++ ){
				if( isAtRange( u, _myHeroes[hid] ) ){
					_myHeroes[hid].neutralUnitsAtRange.push( u.id );
				}
			}
			
			_neutrals.push( u.id );
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
			// Enemy units...
			else {
				_enemies.push(u.id);
				
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
			
		}
		
		_units[u.id] = u;
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
			_myHeroes[i].neutralUnitsAtRange.sort( sortByHealthAsc );
		}
		
		// Action
		for( var i=0; i < _myHeroes.length; i++ ){
			_roles[_myHeroes[i].name](i);
		}
		
		// Keep previous run state
		_previousState = {
			'myHeroes': _myHeroes.slice(),
			'myTower': Object.assign({}, _myTower)
		};
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
			hero = 'HULK';
			_roles[hero] = farmer;
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

/*
 * Farmer: hero who go to spawn points to farm neutral units.
 */
function farmer( heroIdx ){
	var hero = _myHeroes[heroIdx];
	//printErr( '> ' + hero.name );
	
	// Role conf
	var HEALTH_LEVEL_POTION = 500;
	
	// Order spawn points by distance from my tower
	_spawnPoints.sort( function(a, b){ return distance( _myTower, a ) - distance( _myTower, b ); } );
	
	// ---
	// Buy health potion if needed
	if( hero.health < HEALTH_LEVEL_POTION 
			&& _gold >= _potions.health[1].cost ){
		buy( _potions.health[1] );
	}
	// ---
    // Fall back ? Items ?
	else if( genFallback( hero, HEALTH_LEVEL_POTION, false )
			|| genItems( hero, 'farmer' ) ){
		return;
	}
	// ---
	// My tower is under attack: go back to base
	else if( _myTower.underAttack ){
		back();
	}
	// Enemy hero at range and alone: if I would win, fight!
	else if( hero.enemyHeroesAtRange.length > 0
			&& hero.threateningHeroes.length <= 1
			&& hero.enemyUnitsCanAggro.length === 0 
			&& winner( hero, _units[hero.enemyHeroesAtRange[0]] ).id === hero.id ){
		attack( hero.enemyHeroesAtRange[0] );
	}
	// Unit at range: fight
	else if( hero.neutralUnitsAtRange.length > 0 ){
		attack( hero.neutralUnitsAtRange[0] );
	}
	else if( hero.enemyUnitsAtRange.length > 0 ){
		attack( hero.enemyUnitsAtRange[0] );
	}
	// Neutrals between my tower and my front line: check if my hero can beat them
	else if( hero.health > HEALTH_LEVEL_POTION && _neutrals.length > 0 ){
		_neutrals.sort( function(a, b){ return distance(_units[a], hero) - distance(_units[b], hero); } );
		var target;
		for( var i=0; i < _neutrals.length; i++ ){
			var neutral = _units[_neutrals[i]];
			var win = winner( neutral, hero );
			if( neutral.x <= _myFront && distance( neutral, _enemyTower ) > _enemyTower.attackRange // neutral position
					&& win.id === hero.id && win.health > HEALTH_LEVEL_POTION ){ // fight issue
				target = neutral;
				break;
			}
		}
		if( target ){
			moveSafe( target.x, target.y );
		}
		else {
			moveSafe( _myFront, _myTower.y );
		}
	}
	// Move to the front line
	else {
		moveSafe( _myFront, _myTower.y );
	}
}

/*
 * Lane Range: ranged hero who pushes the lane forward, from behind the front.
 */
function laneRange( heroIdx ){
	var hero = _myHeroes[heroIdx];
	//printErr( '> ' + hero.name );
	
	// Role conf
	var HEALTH_RATIO_BACK = 0.5;
	var HEALTH_RATIO_POTION = 0.3;
	var MIN_DISTANCE_FROM_MY_FRONT = 100;
	
	// Distance from enemy front to cover full lane height
	var distanceFromEnemyFront = Math.trunc( Math.sqrt( Math.pow(hero.attackRange, 2) - Math.pow(LANE_HEIGHT/2, 2) ) );
	// Battle position
	var battlePosition = {
		'x': Math.max( _myTower.x, Math.min( _myFront - MIN_DISTANCE_FROM_MY_FRONT, _enemyFront - distanceFromEnemyFront ) ),
		'y': _enemyTower.y
	};
	
	// ---
	// Buy health potion if needed
	if( hero.health < hero.maxHealth * HEALTH_RATIO_POTION 
			&& _gold >= _potions.health[0].cost ){
		buy( _potions.health[0] );
	}
	// ---
    // Fall back ? Items ? IRONMAN Fireball ?
	else if( genFallback( hero, hero.maxHealth * HEALTH_RATIO_BACK, true )
			|| genItems( hero, 'laneRange' )
			|| ironmanFireball( hero )
			|| ironmanBurning( hero ) ){
		return;
	}
	// ---
	// Move the hero in battle position: just behind the front line but far enough from the enemy tower
	else if( distance( hero, battlePosition ) > 50 
			&& distance( battlePosition, _enemyTower ) > _enemyTower.attackRange ){
		if( ironmanBlink( hero, battlePosition ) ){
			return;
		} else {
			move( battlePosition.x, battlePosition.y );
		}
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

function genFallback( hero, healthLevel, fallBackWhenUnderAttack ){
	// If my hero is weak or under attack: fall back if possible or fight.
	if( hero.health < healthLevel || (fallBackWhenUnderAttack && hero.underAttack) ){
		// Back to the tower !
		if( hero.x > _myTower.x ){
			if( ironmanBlink( hero, _myTower ) ){
				return true;
			} else {
				back();
			}
		}
		// My hero is already at the tower...
		else {
			if( ironmanFireball( hero ) ){
				return true;
			}
			// Enemy heroes at range and not too much enemy units around: attack hero
			else if( hero.enemyHeroesAtRange.length > 0 && hero.enemyUnitsCanAggro.length < 2 ){
				attack( hero.enemyHeroesAtRange[0] );
			}
			// Enemy units at range: attack them
			else if( hero.enemyUnitsAtRange.length > 0 ){
				attack( hero.enemyUnitsAtRange[0] );
			}
			// Under attack but no enemies at range: move a bit further away
			else if( hero.underAttack ){
				move( 0, _myTower.y );
			}
			// Wait here to have enough money tobuy a potion...
			else {
				wait();
			}
		}
		return true;
	}
	return false;
}

function genItems( hero, itemSet ){
	// Next item to buy
	var nextItem = _items[_itemSets[itemSet][_myItems[hero.name].maxRank + 1]];
	
	// Full of items: sell the lesser one
	if( hero.itemsOwned === MAX_ITEMS ){
		sell( _items[_myItems[hero.name].list.shift()] );
		return true;
	}
	// Buy next item
	else if( _availableGold >= nextItem.cost ){
		buy( nextItem );
		_myItems[hero.name].list.push( nextItem.name );
		_myItems[hero.name].maxRank++;
		return true;
	}
	
	return false;
}

// Skills algo functions

function ironmanBlink( hero, dest ){
	if( hero.name === 'IRONMAN' && _cooldowns.BLINK === 0 && hero.mana >= 16 ){
		// Skill conf
		var RANGE = 200;
		
		// For now, just using it to move faster regaining mana
		var d = distance( hero, { 'x': dest.x, 'y': dest.y } );
		if( d >= RANGE ){
			blink( hero.x + ( dest.x - hero.x ) * RANGE / d, hero.y + ( dest.y - hero.y ) * RANGE / d );
			return true;
		}
	}
	return false;
}

function ironmanBurning( hero ){
	if( hero.name === 'IRONMAN' && _cooldowns.BURNING === 0 && hero.mana >= 50
			&& ( hero.enemyUnitsAtRange.length > 0 || hero.enemyHeroesAtRange.length > 0 ) ){
		// Skill conf
		var RANGE = 250;
		var RADIUS = 100;
		var SCORE_HERO = 3;
		var SCORE_LAST_HIT = 2;
		var SCORE_LIMIT = 5;
		
		var damage = hero.manaRegeneration * 3 + 30;
				
		var targets = [];
		var potentialTargets = hero.enemyUnitsAtRange.slice().concat( hero.enemyHeroesAtRange );
		
		// For every target at range, count the number of others in the skill radius zone
		for( var i=0; i < potentialTargets.length; i++ ){
			var u = _units[potentialTargets[i]];
			if( distance( u, hero ) <= RANGE ){
				var score = 0;
				for( var j=0; j < _enemies.length; j++ ){
					var uu = _units[_enemies[j]];
					if( distance( u, uu ) <= RADIUS ){ // is in the radius zone
						if( uu.unitType === 'HERO' ){ score += SCORE_HERO; }
						else if( uu.health < damage ){ score += SCORE_LAST_HIT; }
						else { score += 1; }
					}
				}
				if( score >= SCORE_LIMIT ){
					targets.push({ 'score': score, 'x': u.x, 'y': u.y });
				}
			}
		}
		
		// If there is somme targets, sort them by desc score and cast skill on the better
		if( targets.length > 0 ){
			targets.sort( function(a, b){ return b.score - a.score; } );
			burning( targets[0].x, targets[0].y );
			return true;
		}
	}
	return false;
}

function ironmanFireball( hero ){
	if( hero.name === 'IRONMAN' && _cooldowns.FIREBALL === 0 && hero.mana >= 60 ){
		// Skill conf
		var DAMAGE_MIN = 70;
		var RANGE = 900;
		
		var target;
		for( var i=0; i < _enemyHeroes.length; i++ ){
			var enemy = _enemyHeroes[i];
			var d = distance( hero, enemy );
			var damage = hero.mana * 0.2 + 55 * d / 1000;
			if( d <= RANGE // skill range OK
					&& ( damage >= DAMAGE_MIN || damage >= enemy.health ) ){ // worth using skill
				target = enemy;
				break;
			}
		}
		if( target ){
			//var targetX = hero.x + (target.x - hero.x) * 900/1000;
			//var targetY = hero.y + (target.y - hero.y) * 900/1000;
			fireball( target.x, target.y );
			return true;
		}
	}
	return false;
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

function moveSafe( x, y ){
	// Move safe from tower attack range
	var fromTower = distance( _enemyTower, { 'x': x, 'y': y } );
	if( fromTower === _enemyTower.attackRange + 1 ){
		wait();
	}
	else if( fromTower <= _enemyTower.attackRange ){
		var ratio = (_enemyTower.attackRange + 1) / fromTower;
		move( _enemyTower.x + ( x - _enemyTower.x ) * ratio, _enemyTower.y + ( y - _enemyTower.y ) );
	} else {
		move( x, y );
	}
}

function sell( item ){
	print('SELL ' + item.name);
	changeGold( item.cost );
}

function wait(){
	print('WAIT');
}

// Skills actions functions

function blink( x, y ){
	print('BLINK ' + convertX(x) + ' ' + y + ';BLINK !');
	_cooldowns.BLINK = 3;
}

function burning( x, y ){
	print('BURNING ' + convertX(x) + ' ' + y + ';BURNING !');
	_cooldowns.BURNING = 5;
}

function fireball( x, y ){
	print('FIREBALL ' + convertX(x) + ' ' + y + ';FIREBALL !');
	_cooldowns.FIREBALL = 6;
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
	_availableGold = _gold - 2 * _potions.health[0].cost;
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
	return _units[a].health - _units[b].health;
}

function winner( unit1, unit2 ){
	var f1 = Object.assign({}, unit1);
	var f2 = Object.assign({}, unit2);
	while( f1.health > 0 && f2.health > 0 ){
		f1.health -= f2.attackDamage;
		f2.health -= f1.attackDamage;
	}
	var win = f1.health > 0 ? f1 : f2;
	return win;
}

// Debug functions

function stringify( object ){
	return JSON.stringify( object, null, 2 );
}