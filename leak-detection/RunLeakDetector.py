import sys
from os.path import join, exists, basename
import json
from glob import glob
import LeakDetector

MAX_LEAK_DETECTION_LAYERS = 3

PWD = 'myPwd1234'
EMAIL = 'inputdetector@gmail.com'

def get_initiators(request):
    initiators = request['initiators']
    all_initiators = set()
    for initiator in initiators:
        all_initiators.add(initiator)
    
    return all_initiators

# def get_input_field_mutations(mutations, initial_url,final_url):
#     all_mutations = []
#     all_mutations.append((mutations, initial_url, final_url))
#     return all_mutations


def get_input_field_sniffs(input_reads, initial_url, final_url):
    #all_sniffs = set()
    # if not input_reads:
    #     print("HALLO")
    #     return all_sniffs
    sniffs = set()
    
    for input_read in input_reads:
        read_details = input_read['details']
        if 'value' not in read_details:
            continue
        sniffed_value = read_details['value']
        id_sniffed_value = read_details['id']
        if 'source' not in input_read:
            source = None
        else:
            source = input_read['source']
    
        if sniffed_value:
            #print("Sniff found in:", initial_url)
            sniffs.add((initial_url, source, id_sniffed_value, sniffed_value, final_url))
        # else:
        #     print("No sniff found in:", initial_url)

    return sniffs

def detect_leaks_in_request(initial_url, request, detector, final_url):
    if not len(request):
        print('No requests in', final_url)
        return None

    request_url = request['url'] 
    post_body = request.get('postData', '')

    url_leaks = detector.check_url(request_url, MAX_LEAK_DETECTION_LAYERS)
    post_leaks = detector.check_post_data(post_body, MAX_LEAK_DETECTION_LAYERS)

    if url_leaks or post_leaks:
        return f'Base URL {initial_url} has a leak found in: {request_url} with URL leak value: {url_leaks}', f'Post leak value: {post_leaks}'
    else:
        return None


def detect_leaks_in_requests(requests, initial_url, leak_detector, final_url):
    all_request_leaks = []
    if not len(requests):
        print('No requests in', final_url)
        return None

    for request in requests:    
        request_url = request['url']
        if request_url.startswith('blob') or request_url.startswith('about:blank'):
            continue 
        request_leak = detect_leaks_in_request(initial_url, request, leak_detector, final_url)
        if request_leak is None:
            continue
        all_request_leaks += request_leak

    return all_request_leaks

def detect_leaks_in_json(json_path):

    results = json.loads(open(json_path, encoding='utf-8').read())
    if 'data' not in results:
        print("No data in %s" % json_path)
        return None

    final_url = results['finalUrl']

    if final_url == "about:blank":
        return None

    visit_data = results['data']
    calls = visit_data['apis']
    initial_url = results['initialUrl']
    input_reads = calls.get('savedCalls') if calls else None
                    
    requests = visit_data['requests']
    #mutations = visit_data['domchange']
    
    all_sniffs = get_input_field_sniffs(input_reads, initial_url, final_url)  
    #all_mutations = get_input_field_mutations(mutations, initial_url,final_url)

    used_credentials = [PWD, EMAIL]

    leak_detector = LeakDetector.LeakDetector(
        used_credentials, encoding_set=LeakDetector.LIKELY_ENCODINGS,
        hash_set=LeakDetector.LIKELY_HASHES,
        encoding_layers=MAX_LEAK_DETECTION_LAYERS,
        hash_layers=MAX_LEAK_DETECTION_LAYERS,
        debugging=False
    )

    site_leaks = detect_leaks_in_requests(requests, initial_url, leak_detector, final_url)

    return site_leaks, all_sniffs

def detect_leaks(crawl_dir):
    if not exists(crawl_dir):
        return print("Cannot find given directory")

    crawl_name = basename(crawl_dir)
    print("Searching for leaks in", crawl_name)
    all_site_leaks = []
    all_sniffs = set()
    counter = 0
    no_of_leaked_sites = 0
    json_paths = glob(join(crawl_dir, "*_*.json"))
    for json_path in json_paths:
        counter += 1
        leaks = detect_leaks_in_json(json_path)
        if leaks is None:
            continue
        site_leaks, sniffs = leaks 
        all_sniffs.update(sniffs)
        if site_leaks is not None and len(site_leaks):
            print("Leak found in ", basename(json_path))
            all_site_leaks += site_leaks
            no_of_leaked_sites += 1
        else:
            print("No leak in ", basename(json_path))


    print("DONE! Processed %d jsons. Found %d site leaks on %d sites and %d input field sniffs" %
          (counter, len(all_site_leaks), no_of_leaked_sites, len(all_sniffs)))

    if len(all_site_leaks) or len(all_sniffs):        
        print("All leaks in requests: ", all_site_leaks)
        print("All input field sniffs: ", all_sniffs)
    else:
        print("NO LEAKS FOUND")


                

if __name__ == '__main__':
    if len(sys.argv) > 1:
        detect_leaks(sys.argv[1])
    else:
        print("No crawl directory provided")
    


#C:\Users\lvank\Documents\Radboud-Universiteit\Studiejaar-3\Thesis-2\tracker-radar-collector\smallcrawltests\trancotopnew30001-300200
