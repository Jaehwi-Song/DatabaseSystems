SELECT nickname 
FROM ((Youtuber join User on youtuber_id=User.id)
       join RaisingCharacter on User.id=owner_id) 
       join PlayableCharacter on cid=PlayableCharacter.id 
WHERE User.country="Korea" and class="explorer" 
ORDER BY nickname;