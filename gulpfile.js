const gulp = require('gulp');
const gutil = require('gulp-util');
const bower = require('bower');
const concat = require('gulp-concat');
const sass = require('gulp-sass');
const minifyCss = require('gulp-minify-css');
const rename = require('gulp-rename');
const sh = require('shelljs');

const paths = {
  sass: ['./scss/**/*.scss'],
};

gulp.task('default', ['sass']);

gulp.task('sass', (done) => {
  gulp.src('./scss/ionic.app.scss')
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0,
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', () => {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], () => bower.commands.install()
    .on('log', (data) => {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    }));

gulp.task('git-check', (done) => {
  if (!sh.which('git')) {
    console.log(
      'Git is not installed.',
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here: http://git-scm.com/downloads',
      '\n  Once git is installed, run gulp install again.'
    );
    process.exit(1);
  }
  done();
});
