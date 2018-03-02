/**
 * Made with love by AntiSquid, Illedan and Wildum.
 * You can help children learn to code while you participate by donating to CoderDojo.
 **/

var myTeam = parseInt(readline());
var bushAndSpawnPointCount = parseInt(readline()); // usefrul from wood1, represents the number of bushes and the number of places where neutral units can spawn
for (var i = 0; i < bushAndSpawnPointCount; i++) {
    var inputs = readline().split(' ');
    var entityType = inputs[0]; // BUSH, from wood1 it can also be SPAWN
    var x = parseInt(inputs[1]);
    var y = parseInt(inputs[2]);
    var radius = parseInt(inputs[3]);
}
var itemCount = parseInt(readline()); // useful from wood2
for (var i = 0; i < itemCount; i++) {
    var inputs = readline().split(' ');
    var itemName = inputs[0]; // contains keywords such as BRONZE, SILVER and BLADE, BOOTS connected by "_" to help you sort easier
    var itemCost = parseInt(inputs[1]); // BRONZE items have lowest cost, the most expensive items are LEGENDARY
    var damage = parseInt(inputs[2]); // keyword BLADE is present if the most important item stat is damage
    var health = parseInt(inputs[3]);
    var maxHealth = parseInt(inputs[4]);
    var mana = parseInt(inputs[5]);
    var maxMana = parseInt(inputs[6]);
    var moveSpeed = parseInt(inputs[7]); // keyword BOOTS is present if the most important item stat is moveSpeed
    var manaRegeneration = parseInt(inputs[8]);
    var isPotion = parseInt(inputs[9]); // 0 if it's not instantly consumed
}

// game loop
while (true) {
    var gold = parseInt(readline());
    var enemyGold = parseInt(readline());
    var roundType = parseInt(readline()); // a positive value will show the number of heroes that await a command
    var entityCount = parseInt(readline());
    for (var i = 0; i < entityCount; i++) {
        var inputs = readline().split(' ');
        var unitId = parseInt(inputs[0]);
        var team = parseInt(inputs[1]);
        var unitType = inputs[2]; // UNIT, HERO, TOWER, can also be GROOT from wood1
        var x = parseInt(inputs[3]);
        var y = parseInt(inputs[4]);
        var attackRange = parseInt(inputs[5]);
        var health = parseInt(inputs[6]);
        var maxHealth = parseInt(inputs[7]);
        var shield = parseInt(inputs[8]); // useful in bronze
        var attackDamage = parseInt(inputs[9]);
        var movementSpeed = parseInt(inputs[10]);
        var stunDuration = parseInt(inputs[11]); // useful in bronze
        var goldValue = parseInt(inputs[12]);
        var countDown1 = parseInt(inputs[13]); // all countDown and mana variables are useful starting in bronze
        var countDown2 = parseInt(inputs[14]);
        var countDown3 = parseInt(inputs[15]);
        var mana = parseInt(inputs[16]);
        var maxMana = parseInt(inputs[17]);
        var manaRegeneration = parseInt(inputs[18]);
        var heroType = inputs[19]; // DEADPOOL, VALKYRIE, DOCTOR_STRANGE, HULK, IRONMAN
        var isVisible = parseInt(inputs[20]); // 0 if it isn't
        var itemsOwned = parseInt(inputs[21]); // useful from wood1
    }

    // Write an action using print()
    // To debug: printErr('Debug messages...');


    // If roundType has a negative value then you need to output a Hero name, such as "DEADPOOL" or "VALKYRIE".
    // Else you need to output roundType number of any valid action, such as "WAIT" or "ATTACK unitId"
    print('WAIT');
}