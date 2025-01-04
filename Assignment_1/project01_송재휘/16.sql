SELECT avg(level)
FROM PlayableCharacter join RaisingCharacter on cid=PlayableCharacter.id
WHERE class="Cygnus_Knights";