var gulp = require('gulp');
var watch = require('gulp-watch');
var clean = require('gulp-clean');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var mq4HoverShim = require('mq4-hover-shim');
var rimraf = require('rimraf').sync;
var browser = require('browser-sync');
var panini = require('panini');
var concat = require('gulp-concat');
var cssnano = require('cssnano');
var uglify = require('gulp-uglify');
var replace = require('gulp-string-replace');
var replaceName = require('gulp-replace-name');
var argv = require('yargs').argv;
var fileExists = require('file-exists');
var colors = require('colors');
var expect = require('gulp-expect-file');

var port = process.env.SERVER_PORT || 8080;

// Add 3rd party js below, then run 'build'
var vendorJs = [
  'node_modules/jquery/dist/jquery.min.js',
  'node_modules/popper.js/dist/umd/popper.min.js',
  'node_modules/bootstrap/dist/js/bootstrap.min.js',
];

// Add my project js below
var appJs = [
  'src/js/signature.js',
  'src/js/config.js',
  'src/js/ui.js'
];

function getTaskName(self) {
  return self.seq.slice(-1)[0];
}

// Starts a BrowerSync instance
gulp.task('server', ['build'], function () {
  browser.init({
    server: './build',
    port: port
  });
});

// Watch files for changes
gulp.task('watch', function () {
  gulp.watch('./src/scss/**/*', ['compile-sass', browser.reload]);
  gulp.watch('./src/html/pages/**/*', ['compile-html']);
  gulp.watch(['./src/html/{layouts,includes,helpers,data}/**/*'], ['compile-html:reset', 'compile-html']);
  gulp.watch('./src/js/**/*', ['compile-js', browser.reload]);
  gulp.watch('./src/assets/**/*', [browser.reload]);
});

// Erases the build folder
gulp.task('clean', function () {
  rimraf('./build');
});

// Copy assets
gulp.task('copy', function () {
  gulp.src(['./src/assets/**/*'])
    .pipe(gulp.dest('./build/assets/'));
  gulp.src(['./node_modules/bootstrap/dist/css/*.css'])
    .pipe(gulp.dest('./build/css'));
});

var sassOptions = {
  errLogToConsole: true,
  outputStyle: 'expanded'
  // includePaths: bowerpath
};

gulp.task('compile-sass', function () {

  // https://github.com/twbs/mq4-hover-shim
  var processors = [
    mq4HoverShim.postprocessorFor({
      hoverSelectorPrefix: '.bs-true-hover '
    }),
    autoprefixer({
      browsers: [
        'Chrome >= 35',
        'Firefox >= 31',
        'Edge >= 12',
        'Explorer >= 9',
        'iOS >= 8',
        'Safari >= 8',
        'Android 2.3',
        'Android >= 4',
        'Opera >= 12'
      ]
    })
  ];
  // Only 'build' task will minify the css
  if (getTaskName(this) == 'build') {
    processors.push(cssnano());
  }
  return gulp.src('./src/scss/app.scss')
    .pipe(sourcemaps.init())
    .pipe(sass(sassOptions).on('error', sass.logError))
    .pipe(postcss(processors))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./build/css/'));
});

gulp.task('compile-html', function () {
  gulp.src('./src/html/pages/**/*.html')
    .pipe(panini({
      root: './src/html/pages/',
      layouts: './src/html/layouts/',
      partials: './src/html/includes/',
      helpers: './src/html/helpers/',
      data: './src/html/data/'
    }))
    .pipe(replace('../../assets/', '/assets/')) // update the image paths to fit the build folder setup
    .pipe(gulp.dest('./build/'))
    .on('finish', browser.reload);
});

gulp.task('compile-html:reset', function (done) {
  panini.refresh();
  done();
});

gulp.task('compile-vendor', function () {
  return gulp.src(vendorJs)
    // .pipe(expect(vendorJs))
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('./build/js/'))
});

gulp.task('compile-js', function () {
  return gulp.src(appJs)
    .pipe(expect(appJs))
    .pipe(concat('app.js'))
    .pipe(gulp.dest('./build/js/'))
    // .pipe(replace(new RegExp('staticFolder:""', 'g'), '"staticFolder":"/"'))
    //.pipe(uglify()) // use it when production (in Pimcore)
});

gulp.task('build', ['clean', 'copy', 'compile-js', 'compile-vendor', 'compile-sass', 'compile-html']);
gulp.task('default', ['server', 'watch']);