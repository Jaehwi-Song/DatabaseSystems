SELECT name
FROM PlayableCharacter
WHERE name like "A%" OR name like "B%"
      OR name like "C%" OR name like "D%"
ORDER BY name;