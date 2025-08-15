import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';

function formatAjvErrors(errors: any[]): string {
	if (!errors || errors.length === 0) {
		return 'Validation failed';
	}

	return errors
		.map((error) => {
			if (error.message) {
				const path = error.instancePath ? `${error.instancePath}: ` : '';
				return `${path}${error.message}`;
			}

			const path = error.instancePath || error.schemaPath || '';
			const message = error.message || 'Invalid value';
			return path ? `${path}: ${message}` : message;
		})
		.join('<br>');
}

export default fp(async (fastify: FastifyInstance) => {
	const ajv = new Ajv({
		allErrors: true,
		strict: true,
	});

	ajvErrors(ajv);

	fastify.setValidatorCompiler(({ schema }: { schema: any }) => {
		const validate = ajv.compile(schema);

		return function validationFunction(data: any) {
			const isValid = validate(data);
			if (isValid) {
				return { value: data };
			}

			// Format errors with custom handler
			const formattedError = formatAjvErrors(validate.errors || []);

			return {
				error: new Error(formattedError),
			};
		};
	});
});
