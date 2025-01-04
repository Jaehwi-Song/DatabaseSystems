SELECT country
FROM User
GROUP BY country
HAVING count(*)=(SELECT max(user_count)
                 FROM (SELECT count(*) as user_count
                       FROM User
                       GROUP BY country)
                       as Country_user_count);