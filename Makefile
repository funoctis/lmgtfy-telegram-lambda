include .env
export $(shell sed 's/=.*//' .env)

deploy:
	serverless deploy --verbose