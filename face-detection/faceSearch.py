import numpy as np
from stmpy import Driver, Machine
import cv2
import time
from threading import Thread
import paho.mqtt.client as mqtt



##        MQTT CONFIG       ##

class MQTT_Client: #This is the mqtt client for handling messages to the camSTM.
    def __init__(self):
        self.count = 0

    def on_connect(self, client, userdata, flags, rc): #Display a message when connected to the broker
        print("on_connect(): {}".format(mqtt.connack_string(rc)))

    def on_message(self, msg): #Specifies the topic where the message is published
        print("on_message(): topic: {}".format(msg))
        self.client.publish("/ttm4115/team_12/camInternal", msg)
        print("forwarding")


    def start(self, broker, port): #Run this function to establish the mqtt connection
        self.client = mqtt.Client() 
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        print("Connecting to {}:{}".format(broker, port))
        self.client.connect(broker, port) #The connection is established here

        try: #Try catch to start a thread
            thread = Thread(target=self.client.loop_forever)
            thread.start()
        except KeyboardInterrupt:
            print("Interrupted")
            self.client.disconnect()


##     FACE DETECTION      ##

cnt = 0
class Face_Detection():
    
    ##      SPECIFY BROKER AND PORT FOR MQTT      ##
    #broker, port = "localhost", 1883
    #broker, port = "mqtt.item.ntnu.no", 1883
    broker, port = "test.mosquitto.org", 1883

    ##      ESTABLISH MQTT CONNECTION       ##
    myclient = MQTT_Client()
    myclient.start(broker, port)

    ##      OPENCV FACE DETECTION        ##
    faceCascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
    cap = cv2.VideoCapture(0)
    cap.set(3,640) 
    cap.set(4,480) 
    cnt = 0

    def face_search(self):
        while True:
            global cnt
            cnt+=1
            ret, img = self.cap.read()
            img = cv2.flip(img, 1)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.faceCascade.detectMultiScale( #DetectMultiScale is the built in openCV function that 
                                                       #scans the image for faces and return boxes with faces detected
                gray,
                scaleFactor=1.2,
                minNeighbors=5,     
                minSize=(20, 20)
            )
            if(cnt == 24): #Used for publishing every second(ish) instead of every frame
                cnt = 0 #Reset publish counter
                if(faces == ()): #Empty array means no faces detected.
                    print("Not detected")
                    self.notify_left_frame()
                    cnt = 0
                else: 
                    print("Detected")
                    self.notify_in_frame()
                    cnt = 0

            for (x,y,w,h) in faces:
                cv2.rectangle(img,(x,y),(x+w,y+h),(255,0,0),2)
                roi_gray = gray[y:y+h, x:x+w]
                roi_color = img[y:y+h, x:x+w]

            cv2.imshow('video',img) # Comment out to not show video of face detect. Will improve performance(especially for RPi)

            k = cv2.waitKey(30) & 0xff
            if k == 27: # press 'ESC' to quit
                break
    def notify_in_frame(self): #Published mqtt message to the topic to notify that the camera detects a face. Use cam1 for one unit and cam2 for the second unit as 
                               #the broker used is public and we use the same one for both computers
        self.myclient.on_message("cam2_in_frame") 
    def notify_left_frame(self): #Publishes mqtt message that face is not detected
        self.myclient.on_message("cam2_left_frame")

##      Starting the face detection      ##
Face_Detector = Face_Detection() #Creates a facedetect object
Face_Detector.face_search() #Starts the face detection. Loops until esc is pressed

##      After esc is pressed memory is freed      ##
Face_Detector.cap.release() 
cv2.destroyAllWindows()

