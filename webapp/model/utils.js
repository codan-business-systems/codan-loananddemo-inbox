sap.ui.define([
], function () {
	"use strict";
	return {
		/**
		 * Parses the oData return value from a batch submission, and returns
		 * an error message text if any errors were found
		 *
		 * @param {object} oData - oData object returned by 'success' callback
		 * @returns {string} - Error message (if an error occurred);
		 */
		getBatchErrorMessage(oData) {
			let sErrorMessage = "";
			if (oData && oData.__batchResponses) {
				for (var x = 0; x < oData.__batchResponses.length; x++) {
					var oResponse = oData.__batchResponses[x];
					if ((oResponse.statusCode && oResponse.statusCode !== "200") || (!oResponse.statusCode && oResponse.response && oResponse.response
							.statusCode !== "200")) {
						try {
							var response = JSON.parse(oResponse.response.body);
							if (response.error && response.error.message) {
								sErrorMessage = response.error.message.value;
								
								if (/(?<=\()[^]+(?=\))/.test(sErrorMessage)) {
									sErrorMessage = /(?<=\()[^]+(?=\))/.exec(response.error.message.value)[0];
								}
							}
						} catch (err) {
							sErrorMessage = "Unexpected error type/format in batch response.";
						}
					}
				}
			} else {
				sErrorMessage = "Unexpected problem / missing data in batch response.";
			}
			
			return sErrorMessage;
		},
		/**
		 * Parse an error string or object returning a string with error message
		 *
		 * @param {(string|object)} [error] - Error object or string or null/undefined
		 * @param {string} [sActionContext] - Description of activity being performed
		 * @return {string} Error message text
		 */
		parseError: function(error, sActionContext) {
			var sErrorMessage = "";
			if (!error) {
				sErrorMessage = "";
			} else if (typeof error === "string") {
				sErrorMessage = error;
			} else {
				// Attempt to parse error to get to API message text
				if (error.responseText) {
					try {
						var responseText = JSON.parse(error.responseText);
						if (responseText.error && responseText.error.message) {
							sErrorMessage = responseText.error.message.value;
						}
					} catch (err) {
						// responseText is not JSON - probably XML which doesn't look like it can
						// be reliably parsed.  Handle the most common errors here
						if (error.statusCode && error.statusCode === 504) {
							// Error 504 - Gateway timeout.
							sErrorMessage = "504. The connection to the server timed out.";
						} else if (error.statusCode && error.statusCode === 503) {
							// Error 503 - Service unavailable.
							sErrorMessage = "503. Service unavailable";
						}
					}
				}
				
				// If unable to parse application error message, fall back to generic error
				if (!sErrorMessage) {
					sErrorMessage = "Undefined error " + sActionContext;
				}
			}
			
			return sErrorMessage;
		}
	};
});
