/* *
 * Every sentence Nova speaks, in one place.
 * */
module.exports = Object.freeze({
  LAUNCH: 'Hola, soy Nova. ¿Qué quieres saber?',
  LAUNCH_REPROMPT: 'Puedes preguntarme lo que quieras.',
  ASK_MORE: '¿Quieres preguntarme algo más?',
  NO_QUESTION: 'No escuché tu pregunta. ¿Qué quieres saber?',
  YES: 'Dale, ¿qué quieres saber?',
  YES_REPROMPT: '¿Qué quieres saber?',
  HELP: 'Puedes hacerme cualquier pregunta. Por ejemplo, di: pregunta cómo funciona la fotosíntesis, o explícame qué es la inteligencia artificial. ¿Qué quieres saber?',
  GOODBYE: '¡Hasta luego!',
  FALLBACK: 'No entendí bien tu pregunta. Intenta empezar con la palabra pregunta, por ejemplo: pregunta cuál es el río más largo del mundo.',
  UNHANDLED: 'No sé hacer eso todavía. Puedes preguntarme lo que quieras.',
  GENERIC_ERROR: 'Lo siento, tuve un problema para responder. Por favor, inténtalo de nuevo.',
  AI_ERRORS: Object.freeze({
    TIMEOUT: 'Me tardé demasiado pensando la respuesta. ¿Puedes intentarlo de nuevo?',
    BUSY: 'En este momento estoy muy ocupada. Intenta de nuevo en unos segundos.',
    NO_API_KEY: 'Todavía no tengo configurada mi conexión con la inteligencia artificial.',
    QUESTION_TOO_LONG: 'Tu pregunta es muy larga. ¿Puedes decirla más corta?',
    DEFAULT: 'Lo siento, no pude obtener una respuesta. Intenta preguntarme de otra forma.',
  }),
});