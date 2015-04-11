module.exports = function(grunt) {
    grunt.initConfig({
        nodemon: {
          dev: {
            script: 'server.js',
            options: {
                watch: ['server.js', 'user.js', 'post.js']
            }
          }
        }
    });
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.registerTask('default', ['nodemon']);
};
