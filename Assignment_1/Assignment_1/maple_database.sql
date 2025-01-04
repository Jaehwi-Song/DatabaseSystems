DROP DATABASE IF EXISTS maple_database;
CREATE DATABASE maple_database;

use maple_database;


CREATE TABLE Country (
  name varchar(32),
  continent varchar(32),
  primary key (name)
);

CREATE TABLE User (
  id INT,
  name varchar(32),
  country varchar(32),
  primary key (id),
  foreign key (country) references Country (name)
);


CREATE TABLE Youtuber (
  youtuber_id INT,
  country varchar(32),
  foreign key (youtuber_id) references User (id),
  foreign key (country) references Country (name)
);

CREATE TABLE PlayableCharacter (
  id INT,
  name varchar(32),
  class varchar(32),
  branch varchar(32),
  primary key (id)
);

CREATE TABLE RaisingCharacter (
  id INT,
  owner_id INT,
  cid INT,
  level INT,
  nickname varchar(32),
  primary key (id),
  foreign key (owner_id) references User (id),
  foreign key (cid) references PlayableCharacter (id)
);

 
INSERT INTO Country (name, continent) VALUES
('Korea',	'Asia'),
('UK',	'Europe'),
('USA',	'North_America'),
('Australia',	'Oceania');

INSERT INTO User (id, name, country) VALUES
(1, 'Kim', 'Korea'),
(2, 'Sang', 'Korea'),
(3, 'Chang', 'Korea'),
(4, 'Jeong', 'Korea'),
(5, 'Seop', 'Korea'),
(6, 'Ben', 'USA'),
(7, 'Jack', 'UK'),
(8, 'Amy', 'Australia'),
(9, 'James', 'USA');

INSERT INTO Youtuber (youtuber_id, country) VALUES
(2, 'Korea'),
(7, 'UK'),
(9, 'USA'),
(8, 'Australia');

INSERT INTO PlayableCharacter (id, name, class, branch) VALUES
(1, 'Hero', 'Explorer', 'Warrior'),
(2, 'Mercedes', 'Heros', 'Bowman'),
(3, 'Buccaneer', 'Explorer', 'Pirate'),
(4, 'Kaiser', 'Nova', 'Warrior'),
(5, 'Kain', 'Nova', 'Bowman'),
(6, 'Pathfinder', 'Explorer', 'Bowman'),
(7, 'Night_Lord', 'Explorer', 'Thief'),
(8, 'Thunder_Breaker', 'Cygnus_Knights', 'Pirate'),
(9, 'Shade', 'Heros', 'Pirate'),
(17, 'Shadower', 'Explorer', 'Thief'),
(18, 'Luminus', 'Heros', 'Magician'),
(25, 'Bishop', 'Explorer', 'Magician'),
(26, 'Night_Walker', 'Cygnus_Knights', 'Thief'),
(37, 'Battle_Mage', 'Resistance', 'Magician'),
(38, 'Dark_Kinght', 'Explorer', 'Warrior'),
(46, 'Phantom', 'Heros', 'Thief'),
(47, 'Arch_Mage', 'Explorer', 'Magician'),
(54, 'Blaster', 'Resistance', 'Warrior'),
(55, 'Dual_Blade', 'Explorer', 'Thief'),
(84, 'Mihile', 'Cygnus_Knights', 'Warrior'),
(85, 'Corsair', 'Explorer', 'Pirate'),
(116, 'Evan', 'Heros', 'Magician'),
(117, 'Paladin', 'Explorer', 'Warrior'),
(126, 'Mechanic', 'Resistance', 'Pirate'),
(129, 'Cannoneer', 'Explorer', 'Pirate'),
(130, 'Dawn_Warrier', 'Cygnus_Knights', 'Warrior'),
(131, 'Cadena', 'Nova', 'Thief'),
(133, 'Wind_Archer', 'Cygnus_Knights', 'Bowman'),
(137, 'Wile_Hunter', 'Resistance', 'Bowman'),
(150, 'Bowmaster', 'Explorer', 'Bowman'),
(151, 'Blaze_Wizard', 'Cygnus_Knights', 'Magician'),
(152, 'Aran', 'Heros', 'Warrior'),
(172, 'Marksman', 'Explorer', 'Bowman'),
(249, 'Angelic_Buster', 'Nova', 'Pirate');


INSERT INTO RaisingCharacter (id, owner_id, cid, level, nickname) VALUES
(1, 2, 6, 166, 'chyungjeog'),
(2, 1, 3, 190, 'jjyaswag'),
(3, 1, 25, 24, 'ppyake'),
(4, 4, 25, 119, 'dwinin'),
(5, 1, 26, 142, 'kkwaenghwas'),
(6, 9, 131, 190, 'hyeoleuch'),
(7, 4, 131, 119, 'tasskkul'),
(8, 2, 133, 118, 'limbeg'),
(9, 1, 150, 237, 'ppyamub'),
(10, 6, 152, 24, 'nyeongsyug'),
(11, 6, 152, 47, 'lwisom'),
(12, 3, 8, 48, 'sseumppin'),
(13, 3, 117, 49, 'tteoleuch'),
(14, 2, 38, 119, 'jjinnub'),
(15, 2, 55, 154, 'ttelyub'),
(16, 5, 26, 142, 'yegwam'),
(17, 5, 84, 71, 'gobig'),
(18, 5, 85, 72, 'dyattyeoss'),
(19, 8, 46, 73, 'dyumkkwil'),
(20, 8, 152, 119, 'aenghis'),
(21, 9, 130, 213, 'moeshen'),
(22, 7, 25, 95, 'besjjaem'),
(23, 7, 26, 119, 'myoheolm'),
(24, 7, 172, 24, 'kaesspyeom'),
(25, 1, 130, 225, 'swaelkel');