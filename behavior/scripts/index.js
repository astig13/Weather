'use strict'

const getCurrentWeather = require('./lib/getCurrentWeather')

const firstOfEntityRole = function (message, entity, role) {
    role = role || 'generic';

    const slots = message.slots
    const entityValues = message.slots[entity]
    const valsForRole = entityValues ? entityValues.values_by_role[role] : null

    return valsForRole ? valsForRole[0] : null
}

exports.handle = function handle(client) {
    const collectCity = client.createStep({
        satisfied() {
            return Boolean(client.getConversationState().weatherCity)
        },

        extractInfo() {
            const city = firstOfEntityRole(client.getMessagePart(), 'city')
            if (city) {
                client.updateConversationState({
                    weatherCity: city,
                })
                console.log('User wants the weather in:', city.value)
            }
        },

        prompt() {
            client.addResponse('prompt/weather_city')
            client.done()
        },
    })

    const handleGreeting = client.createStep({
        satisfied() {
            return false
        },

        prompt() {
            client.addResponse('greeting')
            client.done()
        }
    })

    const handleGoodbye = client.createStep({
        satisfied() {
            return false
        },

        prompt() {
            client.addResponse('goodbye')
            client.done()
        }
    })

    const provideWeather = client.createStep({
        satisfied() {
            return false
        },

        prompt(callback) {
            const environment = client.getCurrentApplicationEnvironment()
            getCurrentWeather(environment.weatherAPIKey, client.getConversationState().weatherCity.value, resultBody => {
                if (!resultBody || resultBody.cod !== 200) {
                    console.log('Error getting weather.')
                    callback()
                    return
                }

                const weatherDescription = (
                  resultBody.weather.length > 0 ?
                  resultBody.weather[0].description :
                  null
                )

                const weatherData = {
                    temperature: Math.round((resultBody.main.temp - 32) * 1.8),
                    condition: weatherDescription,
                    city: resultBody.name,
                }

                console.log('sending real weather:', weatherData)
                client.addResponse('provide_weather/current', weatherData)
                client.done()

                callback()
            })
        },
    })

    client.runFlow({
        classifications: {
            greeting: 'greeting',
            goodbye: 'goodbye'
        },
        streams: {
            goodbye: handleGoodbye,
            greeting: handleGreeting,
            main: 'getWeather',
            getWeather: [collectCity, provideWeather],
        }
    })
}
