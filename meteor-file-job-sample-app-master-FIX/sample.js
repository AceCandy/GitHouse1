var exec, gm, width, height, imageTypes, isInfinity, myData, myJobs, shortFilename, shorten,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

myData = new FileCollection('images', {
  resumable: true,
  http: [
    {
      method: 'get',
      path: '/id/:_id',
      lookup: function(params, query) {
        return {
          _id: params._id
        };
      }
    }
  ]
});

myJobs = new JobCollection('queue', {
  idGeneration: 'MONGO',
  transform: function(d) {
    var e, res;
    try {
      res = new Job(myJobs, d);
    } catch (_error) {
      e = _error;
      res = d;
    }
    return res;
  }
});

Router.configure({
  layoutTemplate: 'master'
});

Router.route('/', function() {
  return this.redirect('/gallery');
});

Router.route('/gallery', function() {
  this.render('nav', {
    to: 'nav',
    data: 'gallery'
  });
  return this.render('gallery', {
    to: 'content',
    data: myData
  });
});

Router.route('/files', function() {
  this.render('nav', {
    to: 'nav',
    data: 'files'
  });
  return this.render('fileTable', {
    to: 'content',
    data: myData
  });
});

Router.route('/jobs', function() {
  this.render('nav', {
    to: 'nav',
    data: 'jobs'
  });
  return this.render('jobTable', {
    to: 'content',
    data: myJobs
  });
});

if (Meteor.isClient) {
	
  imageTypes = {
    'image/jpeg': true,
    'image/png': true,
    'image/gif': true,
    'image/tiff': true
  };
  Meteor.startup(function() {
    window.addEventListener('dragover', (function(e) {
      return e.preventDefault();
    }), false);
    window.addEventListener('drop', (function(e) {
      return e.preventDefault();
    }), false);
    myData.resumable.on('fileAdded', function(file) {
	  width = prompt("Please enter the picture's width\n you want to display", ""); 
	  height = prompt("Please enter the picture's height\n you want to display", ""); 
	  if(width=='' || typeof(width)=='undefined' || width==null){
		  width = 150;
	  }
	  if(height=='' || typeof(height)=='undefined' || height==null){
		  height = 150;
	  }
      if (imageTypes[file.file.type]) {
        Session.set(file.uniqueIdentifier, 0);
        return myData.insert({
          _id: file.uniqueIdentifier,
          filename: file.fileName,
          contentType: file.file.type,
          metadata:{ width:width, height:height}
        }, function(err, _id) {
          if (err) {
            console.warn("File creation failed!", err);
            return;
          }
          return myData.resumable.upload();
        });
      }
    });
    myData.resumable.on('fileProgress', function(file) {
      return Session.set(file.uniqueIdentifier, Math.floor(100 * file.progress()));
    });
    myData.resumable.on('fileSuccess', function(file) {
      return Session.set(file.uniqueIdentifier, void 0);
    });
    return myData.resumable.on('fileError', function(file) {
      console.warn("Error uploading", file.uniqueIdentifier);
      return Session.set(file.uniqueIdentifier, void 0);
    });
  });
  Tracker.autorun(function() {
    var userId;
    userId = Meteor.userId();
    Meteor.subscribe('allData', userId);
    Meteor.subscribe('allJobs', userId);
    return $.cookie('X-Auth-Token', Accounts._storedLoginToken());
  });
  shorten = function(name, w) {
    if (w == null) {
      w = 16;
    }
    w += w % 4;
    w = (w - 4) / 2;
    if (name.length > 2 * w) {
      return name.slice(0, +w + 1 || 9e9) + '…' + name.slice(-w - 1);
    } else {
      return name;
    }
  };
  shortFilename = function(w) {
    if (w == null) {
      w = 16;
    }
    return shorten(this.filename, w);
  };
  Template.top.helpers({
    loginToken: function() {
      Meteor.userId();
      return Accounts._storedLoginToken();
    },
    userId: function() {
      return Meteor.userId();
    }
  });
  Template.nav.helpers({
    active: function(pill) {
      if (pill === ("" + this)) {
        return "active";
      }
    }
  });
  Template.fileTable.helpers({
    dataEntries: function() {
      return this.find({}, {
        sort: {
          filename: 1
        }
      });
    },
    owner: function() {
      var _ref, _ref1;
      return (_ref = this.metadata) != null ? (_ref1 = _ref._auth) != null ? _ref1.owner : void 0 : void 0;
    },
    id: function() {
      return "" + this._id;
    },
    
    shortFilename: shortFilename,
    uploadStatus: function() {
      var percent;
      percent = Session.get("" + this._id);
      if (percent == null) {
        return "Processing...";
      } else {
        return "Uploading...";
      }
    },
    formattedLength: function() {
      return numeral(this.length).format('0.0b');
    },
    uploadProgress: function() {
      var percent;
      return percent = Session.get("" + this._id);
    }
  });
  Template.fileTable.events({
    'click .del-file': function(e, t) {
      if (this.metadata.thumbOf != null) {
        return t.data.remove(this.metadata.thumbOf);
      } else {
        return t.data.remove(this._id);
      }
    }
  });
  Template.gallery.helpers({
    dataEntries: function() {
      return this.find({
        'metadata.thumbOf': {
          $exists: false
        }
      }, {
        sort: {
          filename: 1
        }
      });
    },
    id: function() {
      return "" + this._id;
    },
    width: function() {
	    console.log(this.metadata.width);
	    var _ref;
	    if ((_ref = this.metadata.width) != null ? _ref.length : void 0){
		  return this.metadata.width;  
	    } else {
	      return 150;
	    }
    },
    height: function() {
	    var _ref;
	    if ((_ref = this.metadata.height) != null ? _ref.length : void 0){
		  return this.metadata.height;  
	    } else {
	      return 150;
	    }
    },
    thumb: function() {
      var _ref;
      if (!((_ref = this.metadata) != null ? _ref.thumbComplete : void 0)) {
        return null;
      } else {
        return "" + this.metadata.thumb;
      }
    },
    isImage: function() {
      return imageTypes[this.contentType] != null;
    },
    shortFilename: shortFilename,
    altMessage: function() {
      if (this.length === 0) {
        return "Uploading...";
      } else {
        return "Processing thumbnail...";
      }
    }
  });
  Template.gallery.rendered = function() {
    return this.data.resumable.assignDrop($("." + myData.root + "DropZone"));
  };
  Template.fileControls.events({
    'click .remove-files': function(e, t) {
      return this.find({
        'metadata.thumbOf': {
          $exists: false
        }
      }).forEach((function(d) {
        return this.remove(d._id);
      }), this);
    }
  });
  Template.jobTable.helpers({
    jobEntries: function() {
      return this.find({});
    }
  });
  Template.jobEntry.rendered = function() {
    return this.$('.button-column').tooltip({
      selector: 'button[data-toggle=tooltip]',
      delay: {
        show: 500,
        hide: 100
      }
    });
  };
  Template.jobEntry.events({
    'click .cancel-job': function(e, t) {
      var job;
      console.log("Cancelling job: " + this._id);
      job = Template.currentData();
      if (job) {
        return job.cancel();
      }
    },
    'click .remove-job': function(e, t) {
      var job;
      console.log("Removing job: " + this._id);
      job = Template.currentData();
      if (job) {
        return job.remove();
      }
    },
    'click .restart-job': function(e, t) {
      var job;
      console.log("Restarting job: " + this._id);
      job = Template.currentData();
      if (job) {
        return job.restart();
      }
    },
    'click .rerun-job': function(e, t) {
      var job;
      console.log("Rerunning job: " + this._id);
      job = Template.currentData();
      if (job) {
        return job.rerun({
          wait: 15000
        });
      }
    },
    'click .pause-job': function(e, t) {
      var job;
      console.log("Pausing job: " + this._id);
      job = Template.currentData();
      if (job) {
        return job.pause();
      }
    },
    'click .resume-job': function(e, t) {
      var job;
      console.log("Resuming job: " + this._id);
      job = Template.currentData();
      if (job) {
        return job.resume();
      }
    }
  });
  isInfinity = function(val) {
    if (val > Job.forever - 7199254740935) {
      return "∞";
    } else {
      return val;
    }
  };
  Template.jobEntry.helpers({
    numDepends: function() {
      var _ref;
      return (_ref = this.depends) != null ? _ref.length : void 0;
    },
    numResolved: function() {
      var _ref;
      return (_ref = this.resolved) != null ? _ref.length : void 0;
    },
    jobId: function() {
      return this._id.valueOf();
    },
    statusBG: function() {
      return {
        waiting: 'primary',
        ready: 'info',
        paused: 'default',
        running: 'default',
        cancelled: 'warning',
        failed: 'danger',
        completed: 'success'
      }[this.status];
    },
    numRepeats: function() {
      return isInfinity(this.repeats);
    },
    numRetries: function() {
      return isInfinity(this.retries);
    },
    runAt: function() {
      Session.get('date');
      return moment(this.after).fromNow();
    },
    lastUpdated: function() {
      Session.get('date');
      return moment(this.updated).fromNow();
    },
    futurePast: function() {
      Session.get('date');
      if (this.after > new Date()) {
        return "text-danger";
      } else {
        return "text-success";
      }
    },
    running: function() {
      if (Template.instance().view.isRendered) {
        Template.instance().$("button[data-toggle=tooltip]").tooltip('destroy');
      }
      return this.status === 'running';
    },
    cancellable: function() {
      var _ref;
      return _ref = this.status, __indexOf.call(Job.jobStatusCancellable, _ref) >= 0;
    },
    removable: function() {
      var _ref;
      return _ref = this.status, __indexOf.call(Job.jobStatusRemovable, _ref) >= 0;
    },
    restartable: function() {
      var _ref;
      return _ref = this.status, __indexOf.call(Job.jobStatusRestartable, _ref) >= 0;
    },
    rerunable: function() {
      return this.status === 'completed';
    },
    pausable: function() {
      var _ref;
      return _ref = this.status, __indexOf.call(Job.jobStatusPausable, _ref) >= 0;
    },
    resumable: function() {
      return this.status === 'paused';
    }
  });
  Template.jobControls.events({
    'click .clear-completed': function(e, t) {
      var ids;
      console.log("clear completed");
      ids = t.data.find({
        status: 'completed'
      }, {
        fields: {
          _id: 1
        }
      }).map(function(d) {
        return d._id;
      });
      console.log("clearing: " + ids.length + " jobs");
      if (ids.length > 0) {
        return t.data.removeJobs(ids);
      }
    },
    'click .pause-queue': function(e, t) {
      var ids;
      if ($(e.target).hasClass('active')) {
        console.log("resume queue");
        ids = t.data.find({
          status: 'paused'
        }, {
          fields: {
            _id: 1
          }
        }).map(function(d) {
          return d._id;
        });
        console.log("resuming: " + ids.length + " jobs");
        if (ids.length > 0) {
          return t.data.resumeJobs(ids);
        }
      } else {
        console.log("pause queue");
        ids = t.data.find({
          status: {
            $in: Job.jobStatusPausable
          }
        }, {
          fields: {
            _id: 1
          }
        }).map(function(d) {
          return d._id(console.log("pausing: " + ids.length + " jobs"));
        });
        if (ids.length > 0) {
          return t.data.pauseJobs(ids);
        }
      }
    },
    'click .stop-queue': function(e, t) {
      if (!$(e.target).hasClass('active')) {
        console.log("stop queue");
        return t.data.stopJobs();
      } else {
        console.log("restart queue");
        return t.data.stopJobs(0);
      }
    },
    'click .cancel-queue': function(e, t) {
      var ids;
      console.log("cancel all");
      ids = t.data.find({
        status: {
          $in: Job.jobStatusCancellable
        }
      }).map(function(d) {
        return d._id;
      });
      console.log("cancelling: " + ids.length + " jobs");
      if (ids.length > 0) {
        return t.data.cancelJobs(ids);
      }
    },
    'click .restart-queue': function(e, t) {
      var ids;
      console.log("restart all");
      ids = t.data.find({
        status: {
          $in: Job.jobStatusRestartable
        }
      }).map(function(d) {
        return d._id;
      });
      console.log("restarting: " + ids.length + " jobs");
      if (ids.length > 0) {
        return t.data.restartJobs(ids, function(e, r) {
          return console.log("Restart returned", r);
        });
      }
    },
    'click .remove-queue': function(e, t) {
      var ids;
      console.log("remove all");
      ids = t.data.find({
        status: {
          $in: Job.jobStatusRemovable
        }
      }).map(function(d) {
        return d._id;
      });
      console.log("removing: " + ids.length + " jobs");
      if (ids.length > 0) {
        return t.data.removeJobs(ids);
      }
    }
  });
}

if (Meteor.isServer) {
	console.log(1);
  gm = Meteor.npmRequire('gm');
  exec = Meteor.npmRequire('child_process').exec;
  myJobs.setLogStream(process.stdout);
  myJobs.promote(2500);
  Meteor.startup(function() {
    var addedFileJob, changedFileJob, fileObserve, removedFileJob, worker, workers;
    myJobs.startJobServer();
    Meteor.publish('allJobs', function(clientUserId) {
      if (this.userId === clientUserId) {
        return myJobs.find({
          'data.owner': this.userId
        });
      } else {
        return [];
      }
    });
    Meteor.publish('allData', function(clientUserId) {
      if (this.userId === clientUserId) {
        return myData.find({
          'metadata._Resumable': {
            $exists: false
          },
          'metadata._auth.owner': this.userId
        });
      } else {
        return [];
      }
    });
    Meteor.users.deny({
      update: function() {
        return true;
      }
    });
    myJobs.allow({
      manager: function(userId, method, params) {
        var ids, numIds, numMatches;
        ids = params[0];
        if (!(typeof ids === 'object' && ids instanceof Array)) {
          ids = [ids];
        }
        numIds = ids.length;
        numMatches = myJobs.find({
          _id: {
            $in: ids
          },
          'data.owner': userId
        }).count();
        return numMatches === numIds;
      },
      jobRerun: function(userId, method, params) {
        var id, numMatches;
        id = params[0];
        numMatches = myJobs.find({
          _id: id,
          'data.owner': userId
        }).count();
        return numMatches === 1;
      },
      stopJobs: function(userId, method, params) {
        return userId != null;
      }
    });
    myData.allow({
      insert: function(userId, file) {
        var _ref;
        file.metadata = (_ref = file.metadata) != null ? _ref : {};
        file.metadata._auth = {
          owner: userId
        };
        
        return true;
      },
      remove: function(userId, file) {
        var _ref, _ref1;
        if (((_ref = file.metadata) != null ? (_ref1 = _ref._auth) != null ? _ref1.owner : void 0 : void 0) && userId !== file.metadata._auth.owner) {
          return false;
        }
        return true;
      },
      read: function(userId, file) {
        var _ref, _ref1;
        if (((_ref = file.metadata) != null ? (_ref1 = _ref._auth) != null ? _ref1.owner : void 0 : void 0) && userId !== file.metadata._auth.owner) {
          return false;
        }
        return true;
      },
      write: function(userId, file, fields) {
        var _ref, _ref1;
        if (((_ref = file.metadata) != null ? (_ref1 = _ref._auth) != null ? _ref1.owner : void 0 : void 0) && userId !== file.metadata._auth.owner) {
          return false;
        }
        return true;
      }
    });
    addedFileJob = function(file) {
      return myData.rawCollection().findAndModify({
        _id: new MongoInternals.NpmModule.ObjectID(file._id.toHexString()),
        'metadata._Job': {
          $exists: false
        }
      }, [], {
        $set: {
          'metadata._Job': null
        }
      }, {
        w: 1
      }, Meteor.bindEnvironment(function(err, doc) {
        var job, jobId, outputFileId;
        if (err) {
          return console.error("Error locking file document in job creation: ", err);
        }
        if (doc) {
          outputFileId = myData.insert({
            filename: "tn_" + file.filename + ".png",
            contentType: 'image/png',
            metadata: file.metadata
          });
          job = new Job(myJobs, 'makeThumb', {
            owner: file.metadata._auth.owner,
            inputFileId: file._id,
            outputFileId: outputFileId
          });
          if (jobId = job.delay(5000).retry({
            wait: 20000,
            retries: 5
          }).save()) {
            myData.update({
              _id: file._id
            }, {
              $set: {
                'metadata._Job': jobId,
                'metadata.thumb': outputFileId
              }
            });
            return myData.update({
              _id: outputFileId
            }, {
              $set: {
                'metadata._Job': jobId,
                'metadata.thumbOf': file._id
              }
            });
          } else {
            return console.error("Error saving new job for file " + file._id);
          }
        }
      }));
    };
    removedFileJob = function(file) {
      var job, thumb, _ref, _ref1;
      if ((_ref = file.metadata) != null ? _ref._Job : void 0) {
        if (job = myJobs.findOne({
          _id: file.metadata._Job,
          status: {
            $in: myJobs.jobStatusCancellable
          }
        }, {
          fields: {
            log: 0
          }
        })) {
          console.log("Cancelling the job for the removed file!", job._id);
          job.cancel(function(err, res) {
            return myData.remove({
              _id: job.data.outputFileId
            });
          });
        }
      }
      if (((_ref1 = file.metadata) != null ? _ref1.thumb : void 0) != null) {
        return thumb = myData.remove({
          _id: file.metadata.thumb
        });
      }
    };
    changedFileJob = function(oldFile, newFile) {
      if (oldFile.md5 !== newFile.md5) {
        if (oldFile.metadata._Job != null) {
          removedFileJob(oldFile);
        }
        return addedFileJob(newFile);
      }
    };
    fileObserve = myData.find({
      md5: {
        $ne: 'd41d8cd98f00b204e9800998ecf8427e'
      },
      'metadata._Resumable': {
        $exists: false
      },
      'metadata.thumbOf': {
        $exists: false
      }
    }).observe({
      added: addedFileJob,
      changed: changedFileJob,
      removed: removedFileJob
    });
    worker = function(job, cb) {
      return exec('gm version', Meteor.bindEnvironment(function(err) {
        var inStream;
        if (err) {
          console.warn('Graphicsmagick is not installed!\n', err);
          job.fail("Error running graphicsmagick: " + err, {
            fatal: true
          });
          return cb();
        }
        job.log("Beginning work on thumbnail image: " + (job.data.inputFileId.toHexString()), {
          level: 'info',
          data: {
            input: job.data.inputFileId,
            output: job.data.outputFileId
          },
          echo: true
        });
        inStream = myData.findOneStream({
          _id: job.data.inputFileId
        });
        myDatas = myData.findOne({
          _id: job.data.inputFileId
        });
        if (!inStream) {
          job.fail('Input file not found', {
            fatal: true
          });
          return cb();
        }
        var x = Number(myDatas.metadata.width);
        var y = Number(myDatas.metadata.height);
        if(isNaN(x)){
	        x = 150;
        }
        if(isNaN(y)){
	        y = 150;
        }
        job.progress(20, 100);
        return gm(inStream).resize(x, y).stream('png', Meteor.bindEnvironment(function(err, stdout, stderr) {
          var outStream;
          stderr.pipe(process.stderr);
          if (err) {
            job.fail("Error running graphicsmagick: " + err);
            return cb();
          } else {
            outStream = myData.upsertStream({
              _id: job.data.outputFileId
            }, {}, function(err, file) {
              if (err) {
                job.fail("" + err);
              } else if (file.length === 0) {
                job.fail('Empty output from graphicsmagick!');
              } else {
                job.progress(80, 100);
                myData.update({
                  _id: job.data.inputFileId
                }, {
                  $set: {
                    'metadata.thumbComplete': true
                  }
                });
                job.log("Finished work on thumbnail image: " + (job.data.outputFileId.toHexString()), {
                  level: 'info',
                  data: {
                    input: job.data.inputFileId,
                    output: job.data.outputFileId
                  },
                  echo: true
                });
                job.done(file);
              }
              return cb();
            });
            if (!outStream) {
              job.fail('Output file not found');
              return cb();
            }
            return stdout.pipe(outStream);
          }
        }));
      }));
    };
    workers = myJobs.processJobs('makeThumb', {
      concurrency: 2,
      prefetch: 2,
      pollInterval: 1000000000
    }, worker);
    return myJobs.find({
      type: 'makeThumb',
      status: 'ready'
    }).observe({
      added: function(doc) {
        return workers.trigger();
      }
    });
  });
}