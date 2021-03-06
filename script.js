/* TODO:
 * - When Blinking with Ironman, be careful of what is in the landing zone (enemy heroes for example)
 * - Change the potion buying algorithm (buy the more rentable on to cover health loss)
 * - Improve attack to gain more last hits
 */

// Const
var AGGRO_DISTANCE = 300;
var DISTANCE_FROM_LANE_CENTER = 30;
var LANE_HEIGHT = 300;
var MAX_ITEMS = 4;
var RANGES = {
	'AOEHEAL': 250,
	'BASH': 150,
	'BLINK': 200,
	'BURNING': 250,
	'CHARGE': 300,
	'COUNTER': 350,
	'FIREBALL': 900,
	'JUMP': 250,
	'PULL': 400,
	'SHIELD': 500,
	'SPEARFLIP': 155,
	'WIRE': 200
}

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
	'hulkFarmer': [],
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
	// Other items
	else {
		// LaneRange needs full damage and mana / mana regen (for Ironman's skills)
		if( item.damage > 0 || item.mana > 0 || item.manaRegeneration > 0 ){
			_itemSets.laneRange.push( item.name );
		}
		// HulkFarmer needs damage, health, maxHealth and moveSpeed
		var farmerScore = 0;
		if( item.damage > 0 ){ farmerScore++; }
		if( item.manaRegeneration > 0 ){ farmerScore++; }
		if( item.health > 0 ){ farmerScore++; }
		if( item.maxHealth > 0 ){ farmerScore++; }
		if( item.moveSpeed > 0 ){ farmerScore++; }
		if( farmerScore >= 2 ){
			_itemSets.hulkFarmer.push( item.name );
		}
	}
	
	_items[item.name] = item;
}

// Sort potions
_potions.health.sort( function(a, b){ return a.health - b.health; } );
_potions.mana.sort( function(a, b){ return a.mana - b.mana; } );

// Sort item sets by asc cost
_itemSets.laneRange.sort( sortItemsByCostAsc );
_itemSets.hulkFarmer.sort( sortItemsByCostAsc );

//printErr( stringify( _items ) );

// SKILLS
// Init skill cooldowns
var _skills = ['BASH', 'BLINK', 'BURNING', 'CHARGE', 'EXPLOSIVE_SHIELD', 'FIREBALL'];
var _cooldowns = {};
for( var i=0; i < _skills.length; i++ ){
	_cooldowns[_skills[i]] = 0;
}

// GAME LOOP
var _round = -2;
var _myItems = {};
var _roles = {};
var _gold, _availableGold, _mySide, _myHeroes, _myTower, _enemyHeroes, _enemyTower, _units, _allies, _neutrals, _enemies, _myFront, _enemyFront;
var _previousState = {
	'myHeroes': [{ 'health': 0 }, { 'health': 0 }],
	'myTower' : { 'health': 0 }
};
while( true ){
    // Gold input
	_gold = parseInt(readline());
	_availableGold = _gold - 2 * _potions.health[0].cost;
    var enemyGold = parseInt(readline());
    
	// Round type
	var roundType = parseInt(readline()); // a positive value will show the number of heroes that await a command
    
	// Init battle fronts coordinates
	_myFront = {
		'top': 520,
		'bottom': 520,
		'x': 100
	};
	_enemyFront = {
		'top': 520,
		'bottom': 520,
		'x': 1820
	};
	
	// Reduce cooldowns
	for( var i=0; i < _skills.length; i++ ){
		if( _cooldowns[_skills[i]] > 0 ){
			_cooldowns[_skills[i]]--;
		}
	}
	
	// Units input
	_units = {};
	_allies = [];
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
				u.enemyUnitsAtMoveAttackRange = [];
				u.enemyHeroesAtRange = []; // IDs of all enemy heroes at range
				u.threateningUnits = []; // IDs of all enemy units from which my hero is at range
				u.threateningHeroes = []; //IDs of all enemy heroes from which my hero is at range
				u.enemyUnitsCanAggro = []; // IDs of all the enemy units who can aggro my hero
				u.neutralUnitsAtRange = []; // IDs of all neutral units at range
				u.allyUnitsAtRange = []; // IDs of all ally units at range 
				
				// Each hero its position on the lane so that they are not aligned while in the lane
				u.laneY = _myTower.y + DISTANCE_FROM_LANE_CENTER * (2 * _myHeroes.length - 1);
				
				// Hero-specific targets lists
				if( u.name === 'HULK' ){
					u.atBashRange = [];
					u.atChargeRange = [];
				}
				else if( u.name === 'IRONMAN' ){
					u.atBurningRange = [];
				}
				
				// Hero-specific threats
				u.atPullRange = false;
				
				// Is my hero under attack ?
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
				_allies.push( u.id );
				
				// Battle front
				_myFront.x = Math.max( _myFront.x, u.x );
				_myFront.bottom = Math.max( _myFront.bottom, u.y );
				_myFront.top = Math.min( _myFront.top, u.y );
			}
			// Enemy units...
			else {
				_enemies.push( u.id );
				
				// Battle front
				_enemyFront.x = Math.min( _enemyFront.x, u.x );
				_enemyFront.bottom = Math.max( _enemyFront.bottom, u.y );
				_enemyFront.top = Math.min( _enemyFront.top, u.y );
			}
		}
		
		_units[u.id] = u;
    }
	
	// Normal round
	if( roundType >= 0 ){
		// For each hero, compute surounding units/heroes data
		for( var i=0; i < _myHeroes.length; i++ ){
			var hero = _myHeroes[i];
			
			// Enemies
			for( var j=0; j < _enemies.length; j++ ){
				var enemy = _units[_enemies[j]];
				var d = distance( hero, enemy );
				
				// At attack range of my hero
				if( d <= hero.attackRange ){
					if( enemy.unitType === 'UNIT' ){
						hero.enemyUnitsAtRange.push( enemy.id );
					} else {
						hero.enemyHeroesAtRange.push( enemy.id );
					}
				}
				// At move-attack range of my hero
				else if( d <= hero.attackRange + hero.movementSpeed * ( 1 - hero.attackSpeed ) ){
					if( enemy.unitType === 'UNIT' ){
						hero.enemyUnitsAtMoveAttackRange.push( enemy.id );
					}
				}
				// Threatening my hero
				if( d <= enemy.attackRange ){
					if( enemy.unitType === 'UNIT' ){
						hero.threateningUnits.push( enemy.id );
					} else {
						hero.threateningHeroes.push( enemy.id );
					}
 				}
				// Lane units who can aggro my hero
				if( enemy.unitType === 'UNIT' && d <= AGGRO_DISTANCE ){
					hero.enemyUnitsCanAggro.push( enemy.id );
				}
				
				// Hero-specific distance checks
				if( hero.name === 'HULK' && enemy.unitType === 'HERO' && d <= RANGES.CHARGE ){
					hero.atChargeRange.push( enemy.id );
					if( d <= RANGES.BASH ){ hero.atBashRange.push( enemy.id ); }
				}
				if( hero.name === 'IRONMAN' && d <= RANGES.BURNING ){
					hero.atBurningRange.push( enemy.id );
				}
				if( enemy.unitType === 'HERO' && enemy.name === 'DOCTOR_STRANGE' 
						&& enemy.mana >= 40
						&& d <= RANGES.PULL ){
					hero.atPullRange = true;
				}
			}
			
			// Allies
			for( var j=0; j < _allies.length; j++ ){
				var ally = _units[_allies[j]];
				if( isAtRange( ally, hero ) ){
					hero.allyUnitsAtRange.push( ally.id );
				}
			}
			
			// Sort potential targets by asc health
			hero.enemyUnitsAtRange.sort( sortByHealthAsc );
			hero.enemyHeroesAtRange.sort( sortByHealthAsc );
			hero.neutralUnitsAtRange.sort( sortByHealthAsc );
			hero.allyUnitsAtRange.sort( sortByHealthAsc );
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
			_roles[hero] = hulkFarmer;
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
 * HulkFarmer: Hulk who go to spawn points to farm neutral units.
 */
function hulkFarmer( heroIdx ){
	var hero = _myHeroes[heroIdx];
	//printErr( '> ' + hero.name );
	
	// Role conf
	var HEALTH_LEVEL_BACK = 250;
	var HEALTH_RATIO_POTION = 0.5;
	var ITEMS_SET = 'hulkFarmer';
	var THREAT_LEVEL_BACK = 5;
	
	// Threat level
	var threat = hero.threateningUnits.length + 3 * hero.threateningHeroes.length;
	
	// ---
	// My tower is under attack: go back to base
	if( _myTower.underAttack ){
		back( hero );
		return;
	}
	// ---
    // Fall back ? Health potion ? Items ?
	if( genFallback( hero, hero.health < HEALTH_LEVEL_BACK || ( hero.shield === 0 && hero.underAttack && threat >= THREAT_LEVEL_BACK ) )
			|| genHealthPotion( hero, hero.maxHealth * HEALTH_RATIO_POTION )
			|| genItems( hero, ITEMS_SET ) ){
		return;
	}
	// Farm, bash or charge
	if( genFarm( hero, HEALTH_LEVEL_BACK, hulkExplosiveShield ) 
			|| hulkBash( hero ) 
			|| hulkCharge( hero ) ){
		return;
	}
	// Shield if threat level is high
	if( threat >= 4 && hulkExplosiveShield( hero ) ){
		return;
	}
	// Enemy hero at range and alone: if I would win, fight!
	if( hero.enemyHeroesAtRange.length > 0
			&& hero.threateningHeroes.length <= 1
			&& hero.enemyUnitsCanAggro.length === 0 ){
		//hulkShieldAndAttack( hero, hero.enemyHeroesAtRange[0] );
		attack( hero.enemyHeroesAtRange[0] );
		return;
	}
	// If a unit at range and last hit: attack
	if( hero.enemyUnitsAtRange.length > 0 && _units[hero.enemyUnitsAtRange[0]].health <= hero.attackDamage ){
		attack( hero.enemyUnitsAtRange[0] );
		return;
	}
	// Deny if possible
	if( genDeny( hero ) ){ return; }
	// Unit at move-attack range
	if( hero.enemyUnitsAtMoveAttackRange.length > 0 ){
		var target = _units[ hero.enemyUnitsAtMoveAttackRange[0] ];
		var move = ratioPoint( hero, target, -hero.attackRange );
		if( move.x < _myFront.x ){
			moveAttack( move.x, move.y, target.id ); return;
		}
	}
	// Unit at range: fight
	if( hero.enemyUnitsAtRange.length > 0 ){
		//hulkShieldAndAttack( hero, hero.enemyUnitsAtRange[0] );
		attack( hero.enemyUnitsAtRange[0] );
		return;
	}
	
	// Else, move to the front line
	moveSafe( _myFront.x - 10, hero.laneY );
}

/*
 * Lane Range: ranged hero who pushes the lane forward, from behind the front.
 */
function laneRange( heroIdx ){
	var hero = _myHeroes[heroIdx];
	//printErr( '> ' + hero.name );
	
	// Role conf
	var BATTLE_POSITION_TOLERANCE = 50;
	var HEALTH_RATIO_BACK = 0.3;
	var HEALTH_RATIO_POTION = 0.5;
	var MIN_DISTANCE_FROM_MY_FRONT = 100;
	
	// Distance from enemy front to cover full lane height
	var distanceFromEnemyFront = Math.trunc( Math.sqrt( Math.pow(hero.attackRange, 2) - Math.pow(LANE_HEIGHT/2, 2) ) );
	
	// Battle position
	var battlePosition = {
		'x': Math.max( _myTower.x, Math.min( _myFront.x - MIN_DISTANCE_FROM_MY_FRONT, _enemyFront.x - distanceFromEnemyFront ) ),
		'y': hero.laneY
	};
	
	// Stay away from DrStrange (out of Pull range)
	var ds = enemyDoctorStrange();
	if( ds ){
		var distDs = distance( battlePosition, ds );
		if( distDs <= RANGES.PULL ){
			var tmp = battlePosition.x;
			battlePosition.x = Math.trunc( ds.x - Math.sqrt( Math.pow( RANGES.PULL, 2 ) - Math.pow( ds.y - battlePosition.y, 2 ) ) ) - 1;
		}
	}
	
	// Fallback ?
	var fallback = ( hero.health < hero.maxHealth * HEALTH_RATIO_BACK 
			|| hero.atPullRange
			|| ( hero.underAttack && hero.threateningUnits.length + hero.threateningHeroes.length > 0 ) );
	
	// ---
    // Health potion ? Fall back ? Items ? IRONMAN skills ?
	if( genHealthPotion( hero, hero.maxHealth * HEALTH_RATIO_POTION )
			|| genFallback( hero, fallback )
			|| genItems( hero, 'laneRange' )
			|| ironmanFireball( hero )
			|| ironmanBurning( hero ) ){
		return;
	}
	// ---
	// Move the hero in battle position: just behind the front line but far enough from the enemy tower
	if( distance( hero, battlePosition ) > BATTLE_POSITION_TOLERANCE 
			&& distance( battlePosition, _enemyTower ) > _enemyTower.attackRange ){
		//if( !ironmanBlink( hero, battlePosition ) ){
			move( battlePosition.x, battlePosition.y );
		//}
		return;
	}
	// Enemy hero at range and no units can aggro: attack
	if( hero.enemyHeroesAtRange.length > 0 && hero.enemyUnitsCanAggro.length === 0 ){
		//attack( hero.enemyHeroesAtRange[0] );
		genSideMoveAttack( hero, hero.enemyHeroesAtRange[0] );
		return;
	}
	// If a unit at range and last hit: attack
	if( hero.enemyUnitsAtRange.length > 0 && _units[hero.enemyUnitsAtRange[0]].health <= hero.attackDamage ){
		attack( hero.enemyUnitsAtRange[0] );
		return;
	}
	// Deny if possible
	if( genDeny( hero ) ){ return; }
	// Unit at range: attack
	if( hero.enemyUnitsAtRange.length > 0 ){
		//attack( hero.enemyUnitsAtRange[0] );
		genSideMoveAttack( hero, hero.enemyUnitsAtRange[0] );
		return;
	}
	// Else, wait
	wait();
}

/*
 * Generic function for denying last hit from the enemy
 */
function genDeny( hero ){
	if( hero.allyUnitsAtRange.length > 0 ){
		// Fo each unit, check if it's killable by an enemy hero
		for( var i=0; i < hero.allyUnitsAtRange.length; i++ ){
			var ally = _units[hero.allyUnitsAtRange[i]];
			if( ally.health <= hero.attackDamage ){
				for( var j=0; j < _enemyHeroes.length; j++ ){
					var enemy = _enemyHeroes[j];
					if( isAtRange( ally, enemy ) && ally.health <= enemy.attackDamage ){
						attack( ally.id );
						return true;
					}
				}
			}
		}
	}
	return false;
}

/*
 * Generic function for fall back conditions
 */
function genFallback( hero, fallbackCondition ){
	if( fallbackCondition ){
		// Back to the tower !
		if( hero.x > _myTower.x ){
			if( ironmanBlink( hero, _myTower ) ){
				return true;
			} else {
				back( hero );
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
				move( 0, hero.laneY );
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

/*
 * Generic function for farming neutral units
 */
function genFarm( hero, healthLimit, beforeAttack ){
	var notThisOne = -1;
	// Farm neutral unit at range
	if( hero.neutralUnitsAtRange.length > 0 ){
		var neutral = _units[hero.neutralUnitsAtRange[0]];
		var win = winner( hero, neutral );
		if( win.id === hero.id && win.health > healthLimit // my hero will win this fight
				&& hero.threateningUnits.length + hero.threateningHeroes.length === 0 ){ // No enemies around
			if( neutral.health === neutral.maxHealth 
					&& beforeAttack( hero ) ){ // neutral has not yet been attacked. So not hostile (can be improved...)
				return true;
			}
			else {
				attack( hero.neutralUnitsAtRange[0] ); return true;
			}
		}
		else if( win.id !== hero.id || win.health <= healthLimit ){
			notThisOne = neutral.id;
		}
		else if( hero.threateningUnits.length + hero.threateningHeroes.length > 0 ){
			back( hero ); return true;
		}
	}
	// Neutrals between my tower and my front line: check if my hero can beat them
	if( _neutrals.length > 0 ){
		_neutrals.sort( function(a, b){ return distance(_units[a], hero) - distance(_units[b], hero); } );
		var target;
		for( var i=0; i < _neutrals.length; i++ ){
			var neutral = _units[_neutrals[i]];
			var win = winner( neutral, hero );
			if( neutral.x <= Math.min( 1200, _myFront.x )  // do not go too far inside enemy side
					&& neutral.id !== notThisOne
					&& distance( neutral, _enemyTower ) > _enemyTower.attackRange // do not approach enemy tower
					&& win.id === hero.id && win.health > healthLimit ){ // check fight issue
				target = neutral;
				break;
			}
		}
		if( target ){
			moveSafe( target.x, target.y ); return true;
		}
	}
	return false;
}

/*
 * Generic function for potion buying
 */
function genHealthPotion( hero, healthLevelPotion ){
	if( hero.health < healthLevelPotion ){
		for( var i=_potions.health.length - 1; i >= 0; i-- ){
			if( _gold >= _potions.health[i].cost && _potions.health[i].health <= hero.maxHealth - hero.health ){
				buy( _potions.health[i] );
				return true;
			}
		}
	}
	return false;
}

/*
 * Generic function for items upgrades
 */
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

function genSideMoveAttack( hero, targetId ){
	var target = _units[targetId];
	var maxDY = Math.trunc( hero.movementSpeed * ( 1 - hero.attackSpeed ) );
	// Target is above
	if( hero.y > target.y ){
		moveAttack( hero.x, hero.y - Math.min( maxDY, hero.y - target.y ), targetId );
	}
	// Target is below
	else if( hero.y < target.y ){
		moveAttack( hero.x, hero.y + Math.min( maxDY, target.y - hero.y ), targetId );
	}
	// Target is on the same line
	else {
		attack( targetId );
	}
}

// Skills algo functions

function hulkBash( hero ){
	if( hero.name === 'HULK' && _cooldowns.BASH === 0 && hero.mana >= 40 && hero.atBashRange.length > 0 ){
		hero.atBashRange.sort( sortByHealthAsc );
		if( hero.enemyUnitsCanAggro.length <= 2 ){
			bash( hero.atBashRange[0] );
			return true;
		}
	}
	return false;
}

function hulkCharge( hero ){
	if( hero.name === 'HULK' && _cooldowns.CHARGE === 0 && hero.mana >= 20 && hero.atChargeRange.length > 0 ){
		// Skill conf
		var AGGRO_MAX = 2;
		
		var targets = [];
		
		for( var i=0; i < hero.atChargeRange.length; i++ ){
			var pTarget = _units[hero.atChargeRange[i]];
			
			// Only charge near the tower for a killing blow
			if( distance( pTarget, _enemyTower ) > _enemyTower.attackRange || hero.attackDamage * 0.5 >= pTarget.health ){
				// For each potential target, search for units around who can aggro
				var aggro = 0;
				for( var i=0; i < _enemies.length; i++ ){
					var unit = _units[_enemies[i]];
					if( unit.unitType === 'UNIT' && distance( pTarget, unit ) <= AGGRO_DISTANCE ){
						aggro++;
					}
				}
				if( aggro <= AGGRO_MAX ){
					targets.push( pTarget.id );
				}
			}
		}
		
		if( targets.length > 0 ){
			targets.sort( sortByHealthAsc );
			charge( targets[0] );
			return true;
		}
	}
	return false;
}

function hulkShieldAndAttack( hero, unitId ){
	if( hero.name === 'HULK' ){
		if( hero.shield === 0 && _cooldowns.EXPLOSIVE_SHIELD === 0 && hero.mana >= 30 ){
			explosiveShield();
		}
		else {
			attack( unitId );
		}
		return true;
	}
	return false;
}

function hulkExplosiveShield( hero ){
	if( hero.name === 'HULK' && _cooldowns.EXPLOSIVE_SHIELD === 0 && hero.mana >= 30 ){
		explosiveShield();
		return true;
	}
	return false;
}

function ironmanBlink( hero, dest ){
	if( hero.name === 'IRONMAN' && _cooldowns.BLINK === 0 && hero.mana >= 16 ){
		// Skill conf
		var RANGE = RANGES.BLINK;
		
		// For now, just using it to move faster regaining mana
		var d = distance( hero, { 'x': dest.x, 'y': dest.y } );
		if( d >= RANGE ){
			blink( Math.trunc(hero.x + ( dest.x - hero.x ) * RANGE / d), 
					Math.trunc(hero.y + ( dest.y - hero.y ) * RANGE / d) );
			return true;
		}
	}
	return false;
}

function ironmanBurning( hero ){
	if( hero.name === 'IRONMAN' && _cooldowns.BURNING === 0 && hero.mana >= 50
			&& hero.atBurningRange.length > 0 ){
		// Skill conf
		var RADIUS = 100;
		var SCORE_HERO = 3;
		var SCORE_LAST_HIT = 2;
		var SCORE_LIMIT = 5;
		
		var damage = hero.manaRegeneration * 5 + 30;
				
		var targets = [];
		
		// For every target at range, count the number of others in the skill radius zone
		for( var i=0; i < hero.atBurningRange.length; i++ ){
			var u = _units[hero.atBurningRange[i]];
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
		var RANGE = RANGES.FIREBALL;
		
		var target;
		for( var i=0; i < _enemyHeroes.length; i++ ){
			var enemy = _enemyHeroes[i];
			var d = distance( hero, enemy );
			var damage = hero.mana * 0.2 + 55 * d / 1000;
			if( d <= RANGE // skill range OK
					&& ( damage >= DAMAGE_MIN || damage >= enemy.health || distance( enemy, _enemyTower ) <= 100 ) ){ // worth using skill
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

function back( hero ){
	if( hero.x > _myFront.x ){
		move( _myTower.x, hero.y, 'Back!' );
	} else {
		move( _myTower.x, hero.laneY, 'Back!' );
	}
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
	print('MOVE_ATTACK ' + convertX(x) + ' ' + y + ' ' + unitId + ';Move & attack');
}

function moveSafe( x, y ){
	// Move safe from tower attack range
	var fromTower = distance( _enemyTower, { 'x': x, 'y': y } );
	if( fromTower === _enemyTower.attackRange + 1 ){
		wait();
	}
	else if( fromTower <= _enemyTower.attackRange ){
		var ratio = (_enemyTower.attackRange + 1) / fromTower;
		move( Math.trunc(_enemyTower.x + ( x - _enemyTower.x ) * ratio), Math.trunc(_enemyTower.y + ( y - _enemyTower.y )) );
	} else {
		move( x, y );
	}
}

function sell( item ){
	print('SELL ' + item.name + ";-" + item.name);
	changeGold( item.cost );
}

function wait(){
	print('WAIT;...');
}

// Skills actions functions

function bash( unitId ){
	print('BASH ' + unitId + ';BASH !');
	_cooldowns.BASH = 10;
}

function blink( x, y ){
	print('BLINK ' + convertX(x) + ' ' + y + ';BLINK !');
	_cooldowns.BLINK = 3;
}

function burning( x, y ){
	print('BURNING ' + convertX(x) + ' ' + y + ';BURNING !');
	_cooldowns.BURNING = 5;
}

function charge( unitId ){
	print('CHARGE ' + unitId + ';CHARGE !');
	_cooldowns.CHARGE = 4;
}

function explosiveShield(){
	print('EXPLOSIVESHIELD;EXPLOSIVE SHIELD !');
	_cooldowns.EXPLOSIVE_SHIELD = 8;
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

var _enemyDoctorStrangeId;
function enemyDoctorStrange(){
	if( _enemyDoctorStrangeId ){
		return _units[_enemyDoctorStrangeId];
	}
	for( var i=0; i < _enemyHeroes.length; i++ ){
		if( _enemyHeroes[i].name === 'DOCTOR_STRANGE' ){
			_enemyDoctorStrangeId = _enemyHeroes[i].id;
			return _units[_enemyDoctorStrangeId];
		}
	}
	return;
}

function pythagore( hypo, side ){
	return Math.sqrt( Math.pow( hypo, 2 ) - Math.pow( side, 2 ) );
}

/*
 * Calculates the coordinates of an intermediary point (I) located between 
 * a position point (P) and a target point (T).
 * 
 * If dist >= 0, it's the wanted PI distance : we want to move {dist} distance
 * from P, in the direction of T.
 * 
 * If dist < 0, it's the wanted IT distance : we want to move from P, in the direction
 * of T, but staying at {dist} distance from T.
 * 
 */
function ratioPoint( position, target, dist ){
	var d = distance( position, target );
	// Case dist > PT
	if( dist >= d ){
		return dist >= 0 ? { 'x': target.x, 'y': target.y } : { 'x': position.x, 'y': position.y };
	}
	// Distance from P
	if( dist >= 0 ){
		return {
			'x': position.x - Math.trunc( (target.x - position.x) * dist / d ),
			'y': position.y - Math.trunc( (target.y - position.y) * dist / d )
		};
	}
	// Distance from T
	if( dist < 0 ){
		dist = -dist;
		return {
			'x': target.x - Math.trunc( (target.x - position.x) * dist / d ),
			'y': target.y - Math.trunc( (target.y - position.y) * dist / d )
		};
	}
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