var x = "test";
$(function(){
    $('a[href^="#"]').click(function() {

        $('html,body').animate({ scrollTop: $(this.hash).offset().top}, 600);

        return false;

        e.preventDefault();

    });
});