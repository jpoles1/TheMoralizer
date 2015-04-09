module.exports = function(grunt) {
    grunt.initConfig({
        nodemon: {
          dev: {
            script: 'server.js',
	    options: {
		watch: ['user.js']
	    }
          }
        }
    });
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.registerTask('default', ['nodemon']);
};
