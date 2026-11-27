/* *
 * Every sentence Nova speaks, in one place.
 * */
module.exports = Object.freeze({
  LAUNCH: 'Hola, soy Nova. ¿Qué quieres saber?',
  LAUNCH_REPROMPT: 'Puedes preguntarme lo que quieras.',
  LAUNCH_RETURNING: '¡Hola de nuevo! Soy Nova. ¿Qué quieres saber hoy?',
  LAUNCH_WITH_INTEREST: (topic) =>
    `¡Hola de nuevo! La última vez hablamos de ${topic}. ¿Seguimos con eso o quieres saber otra cosa?`,
  ASK_MORE: '¿Quieres preguntarme algo más?',
  NO_QUESTION: 'No escuché tu pregunta. ¿Qué quieres saber?',
  YES: 'Dale, ¿qué quieres saber?',
  YES_REPROMPT: '¿Qué quieres saber?',
  RESET: 'Listo, olvidé lo que hablamos. Empecemos de nuevo, ¿qué quieres saber?',
  HELP: 'Puedes preguntarme lo que quieras, por ejemplo: cómo funciona la fotosíntesis, o dame una receta de pasta. Después de una respuesta puedes decir cuéntame más, dame un ejemplo, explícalo más sencillo o repite. Para empezar de cero di nueva conversación. ¿Qué quieres saber?',
  FORGET_ME_CONFIRM: '¿Seguro que quieres que olvide todo lo que sé de ti?',
  FORGET_ME_REPROMPT: 'Dime sí para borrar lo que sé de ti, o no para dejarlo como está.',
  FORGET_ME_DONE: 'Listo, olvidé todo lo que sabía de ti. ¿Qué quieres saber?',
  FORGET_ME_CANCELLED: 'Está bien, no borré nada. ¿Qué quieres saber?',
  FORGET_ME_ERROR: 'No pude borrar tus datos en este momento. Inténtalo de nuevo más tarde. ¿Qué quieres saber?',
  GOODBYE: '¡Hasta luego!',
  FALLBACK:
    'Perdona, no te entendí. Puedes preguntarme directamente, por ejemplo: cuál es el río más largo del mundo, o dame una receta de pasta. ¿Qué quieres saber?',
  FALLBACK_WITH_INTEREST: (topic) =>
    `Perdona, no te entendí. Como te interesa ${topic}, puedes preguntarme algo sobre ${topic}. O pregúntame lo que quieras. ¿Qué quieres saber?`,
  NO_CONTEXT: 'Todavía no hemos hablado de nada. ¿Qué quieres saber?',
  NOTHING_TO_REPEAT: 'Todavía no te he dicho nada que repetir. ¿Qué quieres saber?',
  GREETING: '¡Hola! Aquí estoy, lista para ayudarte. ¿Qué quieres saber?',
  THANKS: '¡Con gusto! ¿Quieres preguntarme algo más?',
  ABOUT:
    'Soy Nova, una asistente de voz que responde tus preguntas con ayuda de la inteligencia artificial de Google Gemini. ¿Qué quieres saber?',
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
